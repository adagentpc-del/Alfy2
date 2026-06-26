import type { OpportunityScore, RelationshipKind, EntityRef, ScoreWeights } from "@alfy2/shared";
import type { Candidate } from "./matchers.js";

/**
 * Deterministic scoring for Opportunity Intelligence. Every opportunity is scored on the five ranking
 * dimensions — revenue, probability, effort, risk, strategic value — and a weighted composite used to
 * rank them. effort and risk are "lower is better", so they enter the composite inverted.
 */

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Per-relationship base levels for revenue / effort / risk / strategic value. */
const BASE: Record<RelationshipKind, { revenue: number; effort: number; risk: number; strategic: number }> = {
  investment: { revenue: 0.9, effort: 0.6, risk: 0.5, strategic: 0.8 },
  solves: { revenue: 0.7, effort: 0.5, risk: 0.35, strategic: 0.7 },
  partnership: { revenue: 0.65, effort: 0.6, risk: 0.5, strategic: 0.7 },
  fit: { revenue: 0.6, effort: 0.4, risk: 0.3, strategic: 0.6 },
  trend_tailwind: { revenue: 0.55, effort: 0.3, risk: 0.4, strategic: 0.6 },
  synergy: { revenue: 0.5, effort: 0.4, risk: 0.3, strategic: 0.6 },
  introduction: { revenue: 0.45, effort: 0.2, risk: 0.2, strategic: 0.4 },
};

const REVENUE_FACTOR: Record<string, number> = { high: 1, medium: 0.8, low: 0.6 };

function revenuePotential(target: EntityRef): number {
  const hint = String(target.attributes["revenue_potential"] ?? "").toLowerCase();
  return REVENUE_FACTOR[hint] ?? 0.85;
}

/** Cross-business or cross-sector links carry more strategic value. */
function crossBoost(c: Candidate): number {
  const diffBusiness =
    c.source.business_id !== null && c.target.business_id !== null && c.source.business_id !== c.target.business_id;
  const sSector = String(c.source.attributes["sector"] ?? "");
  const tSector = String(c.target.attributes["sector"] ?? "");
  const diffSector = sSector !== "" && tSector !== "" && sSector !== tSector;
  return diffBusiness || diffSector ? 0.15 : 0;
}

export function scoreCandidate(c: Candidate, weights: ScoreWeights): OpportunityScore {
  const base = BASE[c.kind];
  const overlapStrength = clamp01(c.overlap / 4);

  let risk = base.risk;
  // A repo flagged "needs review" raises risk; "safe" lowers it.
  const verdict = String(c.source.attributes["verdict"] ?? "");
  if (verdict === "needs_review") risk = clamp01(risk + 0.2);
  if (verdict === "safe") risk = clamp01(risk - 0.1);

  const revenue = clamp01(base.revenue * revenuePotential(c.target));
  const probability = clamp01(0.4 + 0.5 * overlapStrength);
  const effort = clamp01(base.effort);
  const strategic_value = clamp01(base.strategic + crossBoost(c));

  // Composite: positive dims add; effort and risk are inverted (lower is better).
  const num =
    weights.revenue * revenue +
    weights.probability * probability +
    weights.strategic_value * strategic_value +
    weights.effort * (1 - effort) +
    weights.risk * (1 - risk);
  const den = weights.revenue + weights.probability + weights.strategic_value + weights.effort + weights.risk;
  const composite = clamp01(den > 0 ? num / den : 0);

  return {
    revenue: round2(revenue),
    probability: round2(probability),
    effort: round2(effort),
    risk: round2(risk),
    strategic_value: round2(strategic_value),
    composite: round2(composite),
  };
}
