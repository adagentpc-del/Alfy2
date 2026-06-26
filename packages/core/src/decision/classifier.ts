import {
  DecisionCategorySchema,
  type CategoryScore,
  type DecisionCategory,
} from "@alfy2/shared";
import { CATEGORY_LEXICON } from "./lexicons.js";
import { buildBlob, matchedTerms } from "./signals.js";

/**
 * Classifier PORT. The engine depends on this interface, not on a concrete classifier, so an
 * AI-backed classifier (behind the gated AI Gateway) can replace the rule classifier later without
 * touching the engine. Returns scored categories (multi-label) plus the reasons that fired.
 */
export interface DecisionClassifier {
  classify(
    text: string,
    context: Record<string, unknown>,
  ): Promise<{ categories: CategoryScore[]; reasons: string[] }>;
}

const ALL_CATEGORIES = DecisionCategorySchema.options;

/**
 * Deterministic, transparent classifier: counts category signal-term hits and converts them to
 * confidences. Multi-label — every category with at least one hit is returned, ranked. If nothing
 * matches, defaults to a low-confidence `business` label and says so in the reasons.
 */
export class RuleClassifier implements DecisionClassifier {
  async classify(
    text: string,
    context: Record<string, unknown>,
  ): Promise<{ categories: CategoryScore[]; reasons: string[] }> {
    const blob = buildBlob(text, context);
    const reasons: string[] = [];

    const hitsByCategory = new Map<DecisionCategory, string[]>();
    for (const category of ALL_CATEGORIES) {
      const hits = matchedTerms(blob, CATEGORY_LEXICON[category]);
      if (hits.length > 0) {
        hitsByCategory.set(category, hits);
        reasons.push(`matched ${category} signals: ${hits.join(", ")}`);
      }
    }

    if (hitsByCategory.size === 0) {
      reasons.push("no strong category signals; defaulted to business (low confidence)");
      return {
        categories: [{ category: "business", confidence: 0.2 }],
        reasons,
      };
    }

    const categories: CategoryScore[] = [...hitsByCategory.entries()]
      .map(([category, hits]) => ({
        category,
        // 1 hit => 0.5, scaling up toward 1.0; saturates so a flood of weak hits can't hit certainty.
        confidence: Math.min(1, 0.3 + 0.2 * hits.length),
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);

    return { categories, reasons };
  }
}
