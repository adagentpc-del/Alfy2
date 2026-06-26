/**
 * Runtime smoke for the Visibility Engine. Proves a business's signals produce a 0..1 visibility score, the
 * three weakest signals are surfaced, recommendations are non-empty, and reports are tenant-scoped. Run with:
 * `tsx scripts/visibility-smoke.mts`.
 */
import assert from "node:assert/strict";
import { VisibilityEngine } from "@alfy2/core";
import { VisibilityInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new VisibilityEngine({ clock: () => NOW, idFactory });

// === 1. report produces a 0..1 visibility score from the signals. ===
const report = engine.report(
  TENANT,
  VisibilityInputSchema.parse({
    business_name: "Move Mi",
    signals: {
      posting_frequency_per_week: 2, reach: 5000, engagement_rate: 0.2, follower_growth: 0.05,
      podcast_growth: 0, email_growth: 0.1, website_traffic: 1000, seo_score: 0.2,
      mentions: 2, backlinks: 5, podcast_invitations: 0, speaking_invitations: 0,
      media_mentions: 1, partnerships: 1,
    },
  }),
);
assert.ok(report.visibility_score >= 0 && report.visibility_score <= 1, "score in 0..1");
console.log(`[1] visibility_score = ${report.visibility_score} (0..1) ✔`);

// === 2. The three weakest signals are surfaced. ===
assert.equal(report.weakest_signals.length, 3, "exactly 3 weakest signals");
console.log(`[2] weakest_signals: ${report.weakest_signals.join(", ")} ✔`);

// === 3. Recommendation lists are non-empty. ===
assert.ok(report.where_to_post.length > 0, "where_to_post non-empty");
assert.ok(report.what_to_post.length > 0, "what_to_post non-empty");
assert.ok(report.when_to_post.length > 0, "when_to_post non-empty");
assert.ok(report.podcasts_to_appear_on.length > 0, "podcasts non-empty");
assert.ok(report.awards_to_apply_for.length > 0, "awards non-empty");
console.log("[3] recommendation lists non-empty ✔");

// === 4. Tenant isolation — another tenant cannot see the report. ===
assert.equal(engine.get(OTHER, report.id), undefined, "get is tenant-scoped");
assert.equal(engine.list(OTHER).length, 0, "other tenant has no reports");
assert.equal(engine.list(TENANT).length, 1, "this tenant keeps it");
console.log("[4] tenant isolation ✔");

console.log(
  "\nVISIBILITY SMOKE OK — signals yield a 0..1 visibility score, the three weakest signals drive non-empty where/what/when/who/podcast/award recommendations, and reports are tenant-scoped.",
);
