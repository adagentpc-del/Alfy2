/**
 * Runtime smoke for the Production Studio. Proves the seeded Decoded preset ships with its post-approval
 * auto_steps, presets upsert per brand, reusable production assets store and list per brand, and everything is
 * tenant-scoped. Run with: `tsx scripts/production-studio-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ProductionStudio } from "@alfy2/core";
import { UpsertPresetInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const studio = new ProductionStudio({ clock: () => NOW, idFactory });

// === 1. The seeded Decoded preset has its post-approval auto_steps. ===
const decoded = studio.presetFor(TENANT, "decoded_podcast");
assert.ok(decoded, "Decoded preset is seeded on first read");
assert.ok(decoded!.auto_steps.length > 0, "auto_steps populated");
assert.ok(decoded!.auto_steps.includes("generate chapters"), "runs chapters after approval");
console.log(`[1] seeded Decoded preset has ${decoded!.auto_steps.length} auto_steps ✔`);

// === 2. upsertPreset creates a brand's post-approval preset. ===
const fos = studio.upsertPreset(
  TENANT,
  UpsertPresetInputSchema.parse({ brand: "founderos", intro: "FounderOS Intro", auto_steps: ["generate clips", "schedule upload"] }),
);
assert.equal(fos.intro, "FounderOS Intro", "preset stored");
assert.deepEqual(studio.presetFor(TENANT, "founderos")!.auto_steps, ["generate clips", "schedule upload"], "presetFor reads it back");
console.log("[2] upsertPreset / presetFor ✔");

// === 3. addAsset stores reusable production assets; assetsFor lists them per brand. ===
studio.addAsset(TENANT, "founderos", "intro", "FounderOS Intro Sting", "ref:intro:1");
studio.addAsset(TENANT, "founderos", "music", "FounderOS Theme", "ref:music:1");
const fosAssets = studio.assetsFor(TENANT, "founderos");
assert.equal(fosAssets.length, 2, "two FounderOS assets stored");
assert.equal(studio.assetsFor(TENANT, "decoded_podcast").length, 0, "assetsFor is brand-scoped");
console.log(`[3] addAsset / assetsFor (${fosAssets.length} for founderos) ✔`);

// === 4. Tenant isolation — another tenant has its own seed and no founderos overrides/assets. ===
assert.equal(studio.presetFor(OTHER, "founderos"), undefined, "other tenant has no founderos preset");
assert.equal(studio.assetsFor(OTHER, "founderos").length, 0, "other tenant has no assets");
assert.ok(studio.presetFor(OTHER, "decoded_podcast"), "other tenant still seeded with Decoded");
console.log("[4] tenant isolation ✔");

console.log(
  "\nPRODUCTION STUDIO SMOKE OK — the seeded Decoded preset ships with its post-approval auto_steps, presets upsert per brand, reusable production assets store and list per brand, and all state is tenant-scoped.",
);
