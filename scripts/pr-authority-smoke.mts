/**
 * Runtime smoke for the PR & Authority Engine. Proves a trigger detects an opportunity with an angle, drafted
 * pitch, and target outlets (un-approved), the approval gate blocks markSent until approved, ranking orders by
 * trigger priority, and opportunities are tenant-scoped. Run with: `tsx scripts/pr-authority-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PrAuthorityEngine, PrAuthorityError } from "@alfy2/core";
import { DetectPrInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new PrAuthorityEngine({ clock: () => NOW, idFactory });

// === 1. detect → opportunity with angle, drafted pitch, target outlets; not yet approved. ===
const opp = engine.detect(
  TENANT,
  DetectPrInputSchema.parse({ trigger: "funding", headline: "Raised a $10M Series A", business_name: "Move Mi" }),
);
assert.ok(opp.angle.length > 0, "angle drafted");
assert.ok(opp.drafted_pitch.length > 0, "pitch drafted");
assert.ok(opp.target_outlets.length > 0, "target outlets set");
assert.equal(opp.approved_to_send, false, "not approved to send by default");
console.log("[1] detect → angle + drafted_pitch + target_outlets, approved_to_send=false ✔");

// === 2. markSent before approval THROWS PrAuthorityError. ===
assert.throws(() => engine.markSent(TENANT, opp.id), PrAuthorityError, "cannot send before approval");
console.log("[2] markSent before approve throws PrAuthorityError ✔");

// === 3. approve then markSent → status 'sent'. ===
const approved = engine.approve(TENANT, opp.id);
assert.equal(approved.approved_to_send, true, "approval flips the gate");
const sent = engine.markSent(TENANT, opp.id);
assert.equal(sent.status, "sent", "now it can be sent");
console.log("[3] approve → markSent → 'sent' ✔");

// === 4. ranked orders by trigger priority (funding > industry_trend). ===
engine.detect(TENANT, DetectPrInputSchema.parse({ trigger: "industry_trend", headline: "AI in logistics", business_name: "Move Mi" }));
const ranked = engine.ranked(TENANT);
assert.equal(ranked[0]!.trigger, "funding", "funding ranks above industry_trend");
console.log(`[4] ranked by trigger priority (top = ${ranked[0]!.trigger}) ✔`);

// === 5. Tenant isolation — another tenant cannot see or send the opportunity. ===
assert.equal(engine.get(OTHER, opp.id), undefined, "get is tenant-scoped");
assert.throws(() => engine.markSent(OTHER, opp.id), PrAuthorityError, "cross-tenant send rejected");
assert.equal(engine.list(OTHER).length, 0, "other tenant has none");
console.log("[5] tenant isolation ✔");

console.log(
  "\nPR AUTHORITY SMOKE OK — triggers detect opportunities with an angle, drafted pitch, and outlets (un-approved by default), the approval gate blocks markSent until approved, ranking orders by trigger priority, and opportunities are tenant-scoped.",
);
