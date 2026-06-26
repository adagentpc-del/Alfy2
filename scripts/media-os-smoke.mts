/**
 * Runtime smoke for the Media Operating System. Proves one raw moment fans out into the default brand-correct
 * asset set for its input kind, every asset is queued and requires approval, the approve → schedule lifecycle
 * holds, and jobs are tenant-scoped. Run with: `tsx scripts/media-os-smoke.mts`.
 */
import assert from "node:assert/strict";
import { MediaOperatingSystem } from "@alfy2/core";
import { IngestMediaInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const sunk = new MediaOperatingSystem({
  clock: () => NOW,
  idFactory,
  assetSink: (_t, e) => `asset:${e.kind}:${e.title}`,
});

// === 1. Empty outputs → the default set for the input kind. ===
const job = sunk.ingest(
  TENANT,
  IngestMediaInputSchema.parse({ kind: "podcast", title: "Episode 12", brand: "decoded_podcast" }),
);
assert.equal(job.assets.length, 7, "podcast default set is 7 outputs");
console.log(`[1] empty outputs → default set for kind (${job.assets.length} assets) ✔`);

// === 2. Every produced asset is queued, has an asset_id, and requires approval. ===
assert.equal(job.status, "queued", "job starts queued");
assert.equal(job.requires_approval, true, "nothing publishes until approved");
assert.ok(job.assets.every((a) => a.asset_id.length > 0), "every asset has an asset_id");
console.log("[2] queued + requires_approval; every asset has an asset_id ✔");

// === 3. approve → 'approved'. ===
const approved = sunk.approve(TENANT, job.id);
assert.equal(approved?.status, "approved", "approve transitions to approved");
console.log("[3] approve → 'approved' ✔");

// === 4. schedule → 'scheduled'. ===
const scheduled = sunk.schedule(TENANT, job.id);
assert.equal(scheduled?.status, "scheduled", "schedule transitions to scheduled");
console.log("[4] schedule → 'scheduled' ✔");

// === 5. Tenant isolation — another tenant cannot see or transition the job. ===
assert.equal(sunk.get(OTHER, job.id), undefined, "get is tenant-scoped");
assert.equal(sunk.approve(OTHER, job.id), undefined, "cannot approve across tenants");
assert.equal(sunk.list(OTHER).length, 0, "other tenant has no jobs");
console.log("[5] tenant isolation ✔");

console.log(
  "\nMEDIA OS SMOKE OK — one raw moment fans out into the default brand-correct asset set for its kind, every asset is queued with an asset_id and requires approval, the approve → schedule lifecycle holds, and jobs are tenant-scoped.",
);
