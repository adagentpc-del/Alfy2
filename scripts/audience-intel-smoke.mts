/**
 * Runtime smoke for Audience Intelligence. Proves raw signals distill into fears/goals/objections plus a
 * messaging recommendation (with signal_count tracking), re-analyzing the same audience upserts and merges
 * signals into one profile, and profiles are tenant-scoped. Run with: `tsx scripts/audience-intel-smoke.mts`.
 */
import assert from "node:assert/strict";
import { AudienceIntelligence } from "@alfy2/core";
import { AnalyzeAudienceInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new AudienceIntelligence({ clock: () => NOW, idFactory });

// === 1. analyze distills fears / goals / objections from the signals. ===
const profile = engine.analyze(
  TENANT,
  AnalyzeAudienceInputSchema.parse({
    audience_name: "Founders",
    signals: [
      { kind: "dm", text: "I'm worried this is too risky for my team." },
      { kind: "comment", text: "I want to scale revenue without burning out." },
      { kind: "sales_call", text: "It looks expensive — not sure I can afford it." },
    ],
  }),
);
assert.ok(profile.biggest_fears.length > 0, "fears populated");
assert.ok(profile.biggest_goals.length > 0, "goals populated");
assert.ok(profile.objections.length > 0, "objections populated");
console.log("[1] fears / goals / objections populated ✔");

// === 2. messaging_recommendation non-empty; signal_count == signals.length. ===
assert.ok(profile.messaging_recommendation.length > 0, "recommendation present");
assert.equal(profile.signal_count, 3, "signal_count matches input");
console.log(`[2] messaging_recommendation set; signal_count = ${profile.signal_count} ✔`);

// === 3. Re-analyzing the SAME audience upserts (one profile) and merges signal_count. ===
const merged = engine.analyze(
  TENANT,
  AnalyzeAudienceInputSchema.parse({ audience_name: "Founders", signals: [{ kind: "email", text: "I hope to win back my evenings." }] }),
);
assert.equal(merged.id, profile.id, "same profile id (upsert, not insert)");
assert.equal(merged.signal_count, 4, "merged signal_count grows to 4");
assert.equal(engine.list(TENANT).length, 1, "still exactly one profile");
console.log(`[3] re-analyze upserts; signal_count = ${merged.signal_count}, profiles = 1 ✔`);

// === 4. get reads the profile by name. ===
assert.equal(engine.get(TENANT, "Founders")!.id, profile.id, "get by audience_name");
console.log("[4] get by audience_name ✔");

// === 5. Tenant isolation — another tenant has no profile for this audience. ===
assert.equal(engine.get(OTHER, "Founders"), undefined, "get is tenant-scoped");
assert.equal(engine.list(OTHER).length, 0, "other tenant has no profiles");
console.log("[5] tenant isolation ✔");

console.log(
  "\nAUDIENCE INTEL SMOKE OK — raw signals distill into fears/goals/objections plus a messaging recommendation, re-analyzing the same audience upserts and merges signals into one growing profile, and profiles are tenant-scoped.",
);
