/**
 * Runtime smoke for the Executive Decision Journal. Proves a recorded decision schedules its 30/90/365-day
 * reviews, that reviewing a window captures the actual outcome, that recurring patterns surface categories
 * with two or more decisions, and that decisions are tenant-scoped. Run with:
 * `tsx scripts/decision-journal-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ExecutiveDecisionJournal } from "@alfy2/core";
import { RecordDecisionInputSchema, ReviewDecisionInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const journal = new ExecutiveDecisionJournal({ clock: () => NOW, idFactory });

// === 1. record schedules 30/90/365-day reviews. ===
const decision = journal.record(
  TENANT,
  RecordDecisionInputSchema.parse({
    decision: "Hire a senior editor",
    alternatives: ["Outsource", "Stay manual"],
    reasoning: "Editing is the biggest time sink",
    expected_outcome: "Reclaim 6h/week",
    category: "hiring",
  }),
);
for (const w of ["30_day", "90_day", "1_year"]) {
  assert.ok(decision.reviews_due[w], `${w} review scheduled`);
}
console.log("[1] record schedules 30_day / 90_day / 1_year reviews ✔");

// === 2. review captures the actual outcome and records the window. ===
const reviewed = journal.review(
  TENANT,
  decision.id,
  ReviewDecisionInputSchema.parse({ window: "30_day", actual_outcome: "Reclaimed 5h/week so far", lessons_learned: ["Onboard editors with a QA checklist"] }),
);
assert.ok(reviewed!.reviewed_windows.includes("30_day"), "30_day window reviewed");
assert.equal(reviewed!.actual_outcome, "Reclaimed 5h/week so far", "actual outcome captured");
console.log("[2] review('30_day') captures actual_outcome + records window ✔");

// === 3. patterns surfaces categories with two or more decisions. ===
journal.record(TENANT, RecordDecisionInputSchema.parse({ decision: "Hire a second editor", category: "hiring" }));
journal.record(TENANT, RecordDecisionInputSchema.parse({ decision: "Raise prices 10%", category: "pricing" }));
const patterns = journal.patterns(TENANT);
const hiring = patterns.find((p) => p.category === "hiring");
assert.ok(hiring && hiring.count >= 2, "hiring is a recurring pattern (>=2)");
assert.ok(!patterns.some((p) => p.category === "pricing"), "single-decision category is not a pattern");
console.log(`[3] patterns → hiring x${hiring!.count} (>=2) ✔`);

// === 4. Tenant isolation — another tenant cannot see or review the decision. ===
assert.equal(journal.get(OTHER, decision.id), undefined, "get is tenant-scoped");
assert.equal(journal.review(OTHER, decision.id, ReviewDecisionInputSchema.parse({ window: "90_day", actual_outcome: "x" })), undefined, "cannot review across tenants");
assert.equal(journal.list(OTHER).length, 0, "other tenant has none");
console.log("[4] tenant isolation ✔");

console.log(
  "\nDECISION JOURNAL SMOKE OK — a recorded decision schedules its 30/90/365-day reviews, reviewing a window captures the actual outcome and lessons, recurring patterns surface categories with two or more decisions, and decisions are tenant-scoped.",
);
