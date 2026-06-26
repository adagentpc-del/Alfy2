/**
 * Runtime smoke for the Story Mining Engine. Proves a raw experience mines into a fully-structured story
 * (hook + why_it_matters always present, best_channels populated from input or inferred by source), and the
 * by-channel / recent views and tenant isolation hold. Run with: `tsx scripts/story-mining-smoke.mts`.
 */
import assert from "node:assert/strict";
import { StoryMiningEngine } from "@alfy2/core";
import { MineStoryInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new StoryMiningEngine({ clock: () => NOW, idFactory });

// === 1. Mine a win → hook + why_it_matters non-empty; best_channels from the input steer. ===
const win = engine.mine(
  TENANT,
  MineStoryInputSchema.parse({
    source: "win",
    raw: "We closed Acme. But onboarding was rough at first. We learned to ship the kickoff doc on day one.",
    businesses: ["Move Mi"],
    channels: ["pr", "sales"],
  }),
);
assert.ok(win.hook.length > 0, "hook is non-empty");
assert.ok(win.why_it_matters.length > 0, "why_it_matters is non-empty");
assert.deepEqual(win.best_channels, ["pr", "sales"], "best_channels uses the input steer");
assert.equal(win.business_tie_in, "Move Mi", "ties to the mentioned business");
console.log("[1] mine → hook + why_it_matters non-empty; best_channels from input ✔");

// === 2. With no channel steer, best_channels are inferred from the source. ===
const fail = engine.mine(
  TENANT,
  MineStoryInputSchema.parse({ source: "failure", raw: "The launch flopped because we skipped QA.", businesses: ["AI Authority"] }),
);
assert.deepEqual(fail.best_channels, ["case_study", "podcast", "talk"], "failure → inferred channels");
console.log(`[2] no steer → channels inferred by source (${fail.best_channels.join(", ")}) ✔`);

// === 3. byChannel selects only stories that serve a channel. ===
const onPr = engine.byChannel(TENANT, "pr");
assert.ok(onPr.some((s) => s.id === win.id) && !onPr.some((s) => s.id === fail.id), "byChannel filters");
console.log(`[3] byChannel('pr') returns ${onPr.length} story ✔`);

// === 4. recent returns newest first. ===
const recent = engine.recent(TENANT, 2);
assert.equal(recent.length, 2, "recent honors the limit");
assert.equal(recent[0]!.id, fail.id, "newest first");
console.log("[4] recent newest-first ✔");

// === 5. Tenant isolation — another tenant sees none of these stories. ===
assert.equal(engine.list(OTHER).length, 0, "other tenant sees nothing");
assert.equal(engine.get(OTHER, win.id), undefined, "get is tenant-scoped");
assert.equal(engine.list(TENANT).length, 2, "this tenant keeps both");
console.log("[5] tenant isolation ✔");

console.log(
  "\nSTORY MINING SMOKE OK — every experience mines into a structured story (hook + why_it_matters always present, best_channels from the input steer or inferred by source), byChannel / recent views work, and stories are tenant-scoped.",
);
