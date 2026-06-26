/**
 * Runtime smoke for the Market Intelligence engine (MarketIntelEngine).
 * Proves the three jobs deterministically:
 *   1. recordVoc — capture a customer review's pain points / objections; improves[] is derived.
 *   2. detectMarketGap — name an unmet gap with an opportunity + speed-to-market plan.
 *   3. scoreAiVisibility — weak signals → all three 0–100 scores + populated missing_* lists.
 * Run: `tsx scripts/market-intel-smoke.mts`.
 */
import assert from "node:assert/strict";
import { MarketIntelEngine, WEAK_SIGNAL_THRESHOLD } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const BIZ = "acme-saas";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new MarketIntelEngine({ clock: () => NOW, idFactory: id });

// 1. Voice-of-Customer from a real review (pain_points + objections).
const voc = e.recordVoc(TENANT, {
  business_key: BIZ,
  source: "review",
  pain_points: ["setup took two days", "support was slow to respond"],
  objections: ["too expensive for a small team"],
  customer_language: ["it just felt clunky"],
  desires: ["a faster onboarding"],
});
assert.equal(voc.tenant_id, TENANT, "VoC carries the tenant");
assert.equal(voc.business_key, BIZ, "VoC carries the business key");
assert.equal(voc.source, "review", "VoC source preserved");
assert.ok(voc.pain_points.length === 2, "pain points captured");
assert.ok(voc.objections.length === 1, "objections captured");
// improves[] is derived from the signals (objections → sales-scripts/faqs; pain → copy/social; desires → offers).
assert.ok(voc.improves.includes("copy"), "derived improves includes copy");
assert.ok(voc.improves.includes("sales-scripts"), "derived improves includes sales-scripts");
assert.ok(voc.improves.includes("offers"), "derived improves includes offers");
assert.equal(e.listVoc(TENANT, BIZ).length, 1, "VoC persisted (append-only store)");

// 2. Market Gap detection.
const gap = e.detectMarketGap(TENANT, {
  market: "SMB onboarding tooling",
  gap: "No tool gets a non-technical team live in under an hour.",
  why_exists: "Incumbents target enterprise; SMBs are underserved.",
  who_feels_it: "5–20 person teams without a dedicated admin.",
  opportunity: "Self-serve onboarding that ships value on day one.",
  mvp_solution: "Guided setup wizard + templates.",
  revenue_model: "Flat monthly SaaS fee.",
  speed_to_market_plan: "Ship wizard in 30 days; iterate on first 10 customers.",
});
assert.equal(gap.tenant_id, TENANT, "gap carries the tenant");
assert.ok(gap.market.length > 0 && gap.gap.length > 0, "gap has a market and a gap");
assert.ok(gap.speed_to_market_plan.length > 0, "gap has a speed-to-market plan");
assert.equal(e.listGaps(TENANT).length, 1, "gap persisted");

// 3. AI-Search / reputation visibility scoring with some WEAK signals.
//    Strong: website_clarity, name_consistency, contact_clarity. Weak (<=0.5): everything else.
const score = e.scoreAiVisibility(TENANT, {
  business_key: BIZ,
  signals: {
    website_clarity: 0.9,
    entity_consistency: 0.3,
    name_consistency: 0.8,
    category_clarity: 0.2,
    schema_markup: 0.1,
    faq_quality: 0.2,
    comparison_content: 0.1,
    authority_content: 0.3,
    citations: 0.2,
    reviews: 0.4,
    social_proof: 0.3,
    press: 0.1,
    gbp: 0.2,
    linkedin: 0.4,
    contact_clarity: 0.9,
    freshness: 0.3,
  },
});

// All three scores are real numbers within 0–100.
for (const [name, value] of [
  ["ai_visibility_score", score.ai_visibility_score],
  ["search_visibility_score", score.search_visibility_score],
  ["reputation_score", score.reputation_score],
] as const) {
  assert.ok(Number.isFinite(value) && value >= 0 && value <= 100, `${name} is within 0–100`);
}

// With mostly weak signals, all three scores should be on the low side.
assert.ok(score.ai_visibility_score < 50, "weak entity/clarity/schema signals → low ai_visibility_score");
assert.ok(score.reputation_score < 50, "weak reviews/press/proof signals → low reputation_score");

// missing_* lists are populated for the weak signals and EXCLUDE the strong ones.
assert.ok(score.missing_entity_signals.includes("schema_markup"), "missing entity signal flagged (schema_markup)");
assert.ok(score.missing_entity_signals.includes("category_clarity"), "missing entity signal flagged (category_clarity)");
assert.ok(!score.missing_entity_signals.includes("name_consistency"), "strong entity signal not flagged");
assert.ok(!score.missing_entity_signals.includes("contact_clarity"), "strong contact_clarity not flagged");
assert.ok(score.missing_authority_signals.length > 0, "missing authority signals populated");
assert.ok(score.missing_proof.includes("press"), "missing proof flagged (press)");
assert.ok(score.recommended_content.length > 0, "recommended content populated for weak signals");
assert.ok(score.recommended_citations.length > 0, "recommended citations populated for weak signals");

// Threshold is the documented constant.
assert.equal(WEAK_SIGNAL_THRESHOLD, 0.5, "weak-signal threshold is 0.5");
assert.equal(e.listVisibilityScores(TENANT, BIZ).length, 1, "visibility score persisted");

// Determinism: same inputs → same scores.
const score2 = e.scoreAiVisibility(TENANT, { business_key: BIZ, signals: score.signals });
assert.equal(score2.ai_visibility_score, score.ai_visibility_score, "scoring is deterministic (ai)");
assert.equal(score2.search_visibility_score, score.search_visibility_score, "scoring is deterministic (search)");
assert.equal(score2.reputation_score, score.reputation_score, "scoring is deterministic (reputation)");

console.log(
  `MARKET INTEL SMOKE OK — VoC recorded (${voc.improves.length} improve targets), 1 market gap, ` +
    `AEO scores ai=${score.ai_visibility_score}/search=${score.search_visibility_score}/rep=${score.reputation_score}, ` +
    `${score.missing_entity_signals.length} missing entity + ${score.missing_proof.length} missing proof signals`,
);
