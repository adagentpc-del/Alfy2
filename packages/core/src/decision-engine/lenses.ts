import type { DecisionLens, DecisionType } from "@alfy2/shared";

/**
 * Deterministic lens selection by decision type (§35.1 / §35.3). Each decision type maps to the
 * principle-based lenses most relevant to it; the engine builds one {@link DecisionLensReading} per
 * selected lens. Lenses convert publicly known business principles into evaluation criteria — no
 * impersonation (Part I §12).
 */
export const LENSES_BY_TYPE: Record<DecisionType, DecisionLens[]> = {
  pricing: ["offer_acquisition", "behavioral_economics", "cash_discipline"],
  hire: ["operations_people", "leverage_wealth"],
  spend: ["capital_allocation", "cash_discipline"],
  launch: ["customer_obsession", "message_clarity", "attention_distribution", "funnels"],
  partnership: ["leverage_wealth", "inversion_risk"],
  capital: ["capital_allocation", "inversion_risk", "cash_discipline", "investor_discipline"],
  pivot: ["principles_truth", "inversion_risk", "customer_obsession"],
  legal: ["inversion_risk", "cash_discipline"],
};

/** All 13 lenses, in canonical order (§35.1). */
export const ALL_DECISION_LENSES: readonly DecisionLens[] = [
  "capital_allocation",
  "inversion_risk",
  "customer_obsession",
  "offer_acquisition",
  "operations_people",
  "leverage_wealth",
  "principles_truth",
  "message_clarity",
  "attention_distribution",
  "funnels",
  "behavioral_economics",
  "cash_discipline",
  "investor_discipline",
];
