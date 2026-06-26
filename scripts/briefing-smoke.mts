/**
 * Runtime smoke for the Briefing Engine. Proves the morning briefing greets Alyssa, carries the input
 * sections, reads in 5 minutes, and asks no questions; and the evening briefing closes the day with the
 * seven reflection questions, saves each reflection to the configured memory sink, and counts them.
 * Tenant-scoped. Run with: `tsx scripts/briefing-smoke.mts`.
 */
import assert from "node:assert/strict";
import { BriefingEngine } from "@alfy2/core";
import { BriefingInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

// Capture every reflection persisted to Institutional Memory.
const saved: { tenantId: string; reflection: string }[] = [];
const memorySink = (tenantId: string, reflection: string) => saved.push({ tenantId, reflection });
const engine = new BriefingEngine({ clock: () => NOW, idFactory, memorySink });

// === 1. Morning briefing: greeting, sections from input, 5-minute read, no questions. ===
const morning = engine.assemble(
  TENANT,
  BriefingInputSchema.parse({
    kind: "morning",
    date_label: "2026-06-25",
    sections: { priorities: ["Close the Acme proposal"], revenue_opportunities: ["Upsell Move Mi"] },
  }),
);
assert.equal(morning.greeting, "Good morning Alyssa.", "morning greeting");
assert.equal(morning.sections.length, 2, "sections assembled from input");
assert.equal(morning.estimated_reading_minutes, 5, "morning reads in 5 minutes");
assert.equal(morning.questions.length, 0, "morning asks no questions");
console.log("[1] morning: greeting, sections, 5-minute read, no questions ✔");

// === 2. Evening briefing: 7 questions, reflections saved + counted, memory sink called per reflection. ===
const reflections = ["Shipped the deal desk", "Need to delegate inbox triage"];
const evening = engine.assemble(
  TENANT,
  BriefingInputSchema.parse({
    kind: "evening",
    date_label: "2026-06-25",
    sections: { wins: ["Closed Acme"] },
    reflections,
  }),
);
assert.equal(evening.questions.length, 7, "evening closes with 7 reflection questions");
assert.equal(evening.saved_reflection_count, reflections.length, "saved_reflection_count matches input");
assert.equal(saved.length, reflections.length, "memory sink called once per reflection");
assert.ok(saved.every((s) => s.tenantId === TENANT), "sink receives the tenant id");
console.log(`[2] evening: 7 questions, ${evening.saved_reflection_count} reflections saved to memory ✔`);

// === 3. Tenant isolation via list / get. ===
assert.ok(engine.get(TENANT, morning.id), "own tenant can read its briefing");
assert.equal(engine.get("00000000-0000-0000-0000-000000000002", morning.id), null, "other tenant cannot");
assert.equal(engine.list("00000000-0000-0000-0000-000000000002").length, 0, "other tenant lists nothing");
console.log("[3] tenant isolation via list / get ✔");

console.log(
  "\nBRIEFING SMOKE OK — the morning briefing greets Alyssa, carries its sections, reads in 5 minutes, and asks nothing; the evening briefing closes the day with the seven reflection questions and persists each reflection to Institutional Memory; briefings are tenant-scoped.",
);
