/**
 * Runtime smoke for the Brand DNA Engine. Proves each tenant is seeded with all 9 brand identities on first
 * read, a brand resolves from free text by name/keyword, upsert overrides the seeded defaults, and brands are
 * tenant-scoped. Run with: `tsx scripts/brand-dna-smoke.mts`.
 */
import assert from "node:assert/strict";
import { BrandDnaEngine } from "@alfy2/core";
import { UpsertBrandInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new BrandDnaEngine({ clock: () => NOW, idFactory });

// === 1. First read seeds all 9 brands. ===
const brands = engine.list(TENANT);
assert.equal(brands.length, 9, "9 brands seeded");
console.log(`[1] list seeds ${brands.length} brands ✔`);

// === 2. get returns a known brand by key. ===
const decoded = engine.get(TENANT, "decoded_podcast");
assert.ok(decoded, "decoded_podcast exists");
assert.equal(decoded!.name, "Decoded Podcast", "right brand resolved");
console.log("[2] get('decoded_podcast') ✔");

// === 3. resolveBrand auto-detects the brand from free text. ===
const resolved = engine.resolveBrand(TENANT, "Cut a teaser for the Decoded Podcast launch");
assert.equal(resolved, "decoded_podcast", "text mentioning the brand resolves to its key");
console.log(`[3] resolveBrand → '${resolved}' ✔`);

// === 4. upsert overrides the seeded defaults. ===
const updated = engine.upsert(TENANT, UpsertBrandInputSchema.parse({ key: "decoded_podcast", voice: "calm and analytical" }));
assert.equal(updated.voice, "calm and analytical", "voice overridden");
assert.equal(engine.get(TENANT, "decoded_podcast")!.voice, "calm and analytical", "override persists");
console.log("[4] upsert overrides defaults ✔");

// === 5. Tenant isolation — another tenant keeps its own seeded defaults. ===
assert.equal(engine.get(OTHER, "decoded_podcast")!.voice, "bold, curious, insider", "other tenant keeps seed");
assert.equal(engine.list(OTHER).length, 9, "other tenant seeded independently");
console.log("[5] tenant isolation ✔");

console.log(
  "\nBRAND DNA SMOKE OK — every tenant is seeded with all 9 brand identities on first read, brands resolve from free text by name/keyword, upsert overrides the seeded defaults, and identities are tenant-scoped.",
);
