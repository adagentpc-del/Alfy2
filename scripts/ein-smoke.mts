/**
 * Runtime smoke for the Executive Intelligence Network. Proves an article with high importance / urgency /
 * risk classifies as actionable and matches affected businesses, and that two articles sharing a story_key
 * roll into ONE living briefing with a 2-entry timeline (the story is never reread). Tenant-scoped.
 * Run with: `tsx scripts/ein-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ExecutiveIntelligenceNetwork } from "@alfy2/core";
import { ArticleInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const ein = new ExecutiveIntelligenceNetwork({ clock: () => NOW, idFactory });

// === 1. A high-signal article classifies as actionable and matches its business. ===
const item = ein.assess(
  TENANT,
  ArticleInputSchema.parse({
    title: "Regulator opens probe touching Move Mi",
    body: "A new investigation directly names Move Mi and demands a response within days.",
    source: "Reg Watch",
    businesses: ["Move Mi"],
    signals: { importance: 0.9, urgency: 0.9, risk: 0.8, revenue_potential: 0.6, strategic_value: 0.8 },
    story_key: "movemi-probe",
  }),
);
assert.notEqual(item.classification, "ignore", "high-signal article is not ignored");
assert.ok(item.businesses_affected.includes("Move Mi"), "matched business surfaced");
assert.ok(item.scores.importance > 0 && item.scores.urgency > 0, "scores populated");
console.log(`[1] high-signal article classified '${item.classification}', affects Move Mi ✔`);

// === 2. Two articles sharing a story_key roll into ONE living briefing with a 2-entry timeline. ===
const second = ein.assess(
  TENANT,
  ArticleInputSchema.parse({
    title: "Move Mi probe escalates",
    body: "The Move Mi probe widens with new subpoenas issued today.",
    source: "Reg Watch",
    businesses: ["Move Mi"],
    signals: { importance: 0.9, urgency: 0.9, risk: 0.8 },
    story_key: "movemi-probe",
  }),
);
const briefing = ein.briefingFor(TENANT, "movemi-probe");
assert.ok(briefing, "a living briefing exists for the story key");
assert.equal(briefing!.timeline.length, 2, "two entries — never duplicated into separate briefings");
assert.equal(item.related_briefing_id, briefing!.id, "first item points at the briefing");
assert.equal(second.related_briefing_id, briefing!.id, "second item points at the same briefing");
assert.equal(ein.livingBriefings(TENANT).length, 1, "exactly one living briefing for the story");
console.log("[2] same story_key → one living briefing, 2-entry timeline, both items linked ✔");

// === 3. Tenant isolation. ===
assert.ok(ein.get(TENANT, item.id), "own tenant can read its item");
assert.equal(ein.get("00000000-0000-0000-0000-000000000002", item.id), undefined, "other tenant cannot");
assert.equal(ein.briefingFor("00000000-0000-0000-0000-000000000002", "movemi-probe"), undefined, "briefing tenant-scoped");
console.log("[3] tenant isolation on items and briefings ✔");

console.log(
  "\nEIN SMOKE OK — actionable classification with affected-business matching and populated scores, and developing stories rolling into ONE living briefing with a growing timeline (never reread), all tenant-scoped.",
);
