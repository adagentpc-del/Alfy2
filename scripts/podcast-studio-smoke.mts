/**
 * Runtime smoke for the Podcast Studio OS. Proves an episode idea is fleshed into a full plan (title, hook,
 * premise, why now, talking points, clips) at the "idea" stage, that advance moves the stage, and that
 * episodes are tenant-scoped. Run with: `tsx scripts/podcast-studio-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PodcastStudioOS } from "@alfy2/core";
import { EpisodeIdeaInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const studio = new PodcastStudioOS({ clock: () => NOW, idFactory });

const plan = studio.plan(
  TENANT,
  EpisodeIdeaInputSchema.parse({
    topic: "agentic operating systems",
    source: "intelligence_network",
    angle: "why most automation fails before it scales",
    related_businesses: ["AI Authority"],
    guest_name: "Dr. Rivera",
  }),
);

// === 1. The idea is fleshed into a full plan at the "idea" stage. ===
assert.ok(plan.title.length > 0, "title generated");
assert.ok(plan.hook.length > 0, "hook generated");
assert.ok(plan.premise.length > 0, "premise generated");
assert.ok(plan.why_now.length > 0, "why_now generated");
assert.ok(plan.talking_points.length > 0, "talking_points non-empty");
assert.ok(plan.clips_to_create.length > 0, "clips_to_create non-empty");
assert.equal(plan.stage, "idea", "starts at the idea stage");
console.log("[1] episode idea → full plan (title / hook / premise / why now / talking points / clips), stage 'idea' ✔");

// === 2. advance moves the stage. ===
const scheduled = studio.advance(TENANT, plan.id, "scheduled");
assert.equal(scheduled.stage, "scheduled", "stage advanced to scheduled");
assert.equal(scheduled.id, plan.id, "same episode, advanced in place");
console.log("[2] advance moves the stage to 'scheduled' ✔");

// === 3. Tenant isolation. ===
assert.ok(studio.get(TENANT, plan.id), "own tenant can read its episode");
assert.equal(studio.get("00000000-0000-0000-0000-000000000002", plan.id), undefined, "other tenant cannot");
console.log("[3] tenant isolation on episodes ✔");

console.log(
  "\nPODCAST STUDIO SMOKE OK — an episode idea becomes a fully fleshed plan at the 'idea' stage, advance walks it through production stages, and episodes are tenant-scoped.",
);
