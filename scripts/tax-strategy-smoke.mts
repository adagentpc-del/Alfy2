/**
 * Runtime smoke for the Legal Tax Strategy Analyzer. Proves recommendations are gated by the financials,
 * EVERY recommendation requires professional review, the standing disclaimer is present (legal optimization /
 * avoidance, never evasion), high profit + payroll surfaces an entity/owner-comp rec, and any
 * international/offshore rec is high risk. LEGAL optimization only — analysis, never advice. Tenant-scoped.
 * Run with: `tsx scripts/tax-strategy-smoke.mts`.
 */
import assert from "node:assert/strict";
import { LegalTaxStrategyAnalyzer, TAX_DISCLAIMER } from "@alfy2/core";
import { TaxAnalysisInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const analyzer = new LegalTaxStrategyAnalyzer({ clock: () => NOW, idFactory });

const analysis = analyzer.analyze(
  TENANT,
  TaxAnalysisInputSchema.parse({
    subject: "Move Mi",
    is_business: true,
    annual_revenue_usd: 400000,
    annual_profit_usd: 180000,
    has_payroll: true,
    focus_areas: [],
  }),
);

// === 1. Recommendations are produced and every one requires professional review. ===
assert.ok(analysis.recommendations.length > 0, "recommendations non-empty");
assert.ok(
  analysis.recommendations.every((r) => r.requires_professional_review === true),
  "every rec requires professional review",
);
console.log(`[1] ${analysis.recommendations.length} recommendations, all require professional review ✔`);

// === 2. The standing disclaimer is present — legal optimization / avoidance, never evasion. ===
assert.equal(analysis.disclaimer, TAX_DISCLAIMER, "disclaimer is the standing TAX_DISCLAIMER");
const lower = analysis.disclaimer.toLowerCase();
assert.ok(lower.includes("legal") && lower.includes("avoidance") && lower.includes("never evasion"), "legal/avoidance not evasion");
console.log("[2] disclaimer present: legal optimization (avoidance), never evasion ✔");

// === 3. High profit + payroll surfaces an entity_election or owner_compensation recommendation. ===
const hasGating = analysis.recommendations.some(
  (r) => r.area === "entity_election" || r.area === "owner_compensation",
);
assert.ok(hasGating, "high profit + payroll → entity_election or owner_compensation rec");
console.log("[3] high profit + payroll → entity_election / owner_compensation rec ✔");

// === 4. Any international/offshore rec is risk_level 'high'. ===
const offshore = analysis.recommendations.find((r) => r.area === "international_offshore");
if (offshore) assert.equal(offshore.risk_level, "high", "international_offshore is high risk");
console.log("[4] international_offshore rec (if present) is risk_level 'high' ✔");

// === 5. Tenant isolation — the analysis is scoped to its tenant. ===
assert.ok(analyzer.get(TENANT, analysis.id), "own tenant can read its analysis");
assert.equal(analyzer.get("00000000-0000-0000-0000-000000000002", analysis.id), undefined, "other tenant cannot");
console.log("[5] tenant isolation on stored analyses ✔");

console.log(
  "\nTAX STRATEGY SMOKE OK — gated LEGAL tax-optimization recommendations, every one requiring CPA/attorney review, the standing disclaimer (legal avoidance, never evasion), entity/owner-comp recs for high profit + payroll, high-risk international/offshore, and tenant isolation.",
);
