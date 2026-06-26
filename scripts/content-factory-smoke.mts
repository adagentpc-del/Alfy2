/**
 * Runtime smoke for the Content Factory. Proves one source builds a full linked package of exactly 42 pieces
 * (5 shorts, 10 X posts, etc. by kind), every piece links back to the source ref, and packages are
 * tenant-scoped. Run with: `tsx scripts/content-factory-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ContentFactory } from "@alfy2/core";
import { BuildPackageInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const factory = new ContentFactory({
  clock: () => NOW,
  idFactory,
  assetSink: (_t, e) => `asset:${e.kind}:${e.index}`,
});

// === 1. One source → a package of exactly 42 pieces. ===
const pkg = factory.build(
  TENANT,
  BuildPackageInputSchema.parse({ source_title: "How leverage compounds", source_ref: "media:job:42", brand: "founderos" }),
);
assert.equal(pkg.total_pieces, 42, "1+5+5+10+5+3+1+1+5+1+1+1+1+1+1 = 42");
assert.equal(pkg.pieces.length, 42, "pieces array matches total");
console.log(`[1] one source → ${pkg.total_pieces} pieces ✔`);

// === 2. Per-kind counts match the multiplier (5 shorts + 10 x_post). ===
const count = (kind: string) => pkg.pieces.filter((p) => p.kind === kind).length;
assert.equal(count("short"), 5, "5 shorts");
assert.equal(count("x_post"), 10, "10 x posts");
assert.equal(count("youtube_long"), 1, "1 long YouTube");
assert.equal(count("podcast_clip"), 5, "5 podcast clips");
console.log("[2] per-kind counts (5 shorts, 10 x_post, 1 youtube_long, 5 clips) ✔");

// === 3. Every piece is linked back to the source via the package ref + an asset_id. ===
assert.equal(pkg.source_ref, "media:job:42", "package retains source ref");
assert.ok(pkg.pieces.every((p) => p.asset_id.length > 0 && p.title.includes("How leverage compounds")), "pieces linked to source");
console.log("[3] every piece linked to the source ✔");

// === 4. Tenant isolation — another tenant cannot see the package. ===
assert.equal(factory.get(OTHER, pkg.id), undefined, "get is tenant-scoped");
assert.equal(factory.list(OTHER).length, 0, "other tenant has no packages");
assert.equal(factory.list(TENANT).length, 1, "this tenant keeps it");
console.log("[4] tenant isolation ✔");

console.log(
  "\nCONTENT FACTORY SMOKE OK — one source builds a full linked package of exactly 42 pieces (5 shorts + 10 X posts + 1 long YouTube + 5 clips + …), every piece links back to the source, and packages are tenant-scoped.",
);
