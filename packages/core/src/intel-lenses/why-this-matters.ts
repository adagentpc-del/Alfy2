import {
  WhyThisMattersInputSchema,
  WhyThisMattersSchema,
  type WhyThisMattersInput,
  type WhyThisMatters,
} from "@alfy2/shared";

/**
 * The "Why This Matters to Me" lens (docs/adr/ADR-0069-intel-lenses.md). For any news, article, repo, book,
 * law, or tech update, it answers: which of Alyssa's businesses it affects, whether anything must change,
 * competitive advantage, compliance risk, product opportunity, test-or-ignore, which assets / agents /
 * workflows / SOPs to update, and whether it belongs in a strategy review. A pure-compute read model —
 * deterministic and stores nothing — but still tenant-scoped for call-site consistency.
 */

export class WhyThisMattersEngine {
  /** Assess a single piece of intel through the "why this matters to me" lens. */
  assess(_tenantId: string, input: WhyThisMattersInput): WhyThisMatters {
    const i = WhyThisMattersInputSchema.parse(input);

    const haystack = `${i.content} ${i.summary}`.toLowerCase();
    const businessesAffected = i.businesses.filter(
      (name) => name.length > 0 && haystack.includes(name.toLowerCase()),
    );

    const needsChange = i.competitive || i.compliance_sensitive || businessesAffected.length > 0;
    const competitiveAdvantage = i.competitive && businessesAffected.length > 0;
    const complianceRisk = i.compliance_sensitive;
    const productOpportunity = i.product_relevant;
    const shouldTest = productOpportunity || competitiveAdvantage;
    const shouldIgnore = !needsChange && !productOpportunity && businessesAffected.length === 0;

    const toUpdate: string[] = [];
    if (complianceRisk) toUpdate.push("Update compliance SOPs");
    if (productOpportunity) toUpdate.push("Brief product agent");
    if (competitiveAdvantage) toUpdate.push("Update positioning assets");

    const addToStrategyReview: WhyThisMatters["add_to_strategy_review"] =
      complianceRisk || businessesAffected.length > 1 ? "quarterly" : shouldTest ? "monthly" : "none";

    return WhyThisMattersSchema.parse({
      title: i.title,
      businesses_affected: businessesAffected,
      needs_change: needsChange,
      competitive_advantage: competitiveAdvantage,
      compliance_risk: complianceRisk,
      product_opportunity: productOpportunity,
      should_test: shouldTest,
      should_ignore: shouldIgnore,
      assets_agents_workflows_to_update: toUpdate,
      add_to_strategy_review: addToStrategyReview,
      decision: this.decision({
        shouldIgnore,
        complianceRisk,
        competitiveAdvantage,
        productOpportunity,
        shouldTest,
        businessesAffected,
        addToStrategyReview,
      }),
    });
  }

  /** A one-line synthesis of the lens output — the call to action. */
  private decision(d: {
    shouldIgnore: boolean;
    complianceRisk: boolean;
    competitiveAdvantage: boolean;
    productOpportunity: boolean;
    shouldTest: boolean;
    businessesAffected: string[];
    addToStrategyReview: WhyThisMatters["add_to_strategy_review"];
  }): string {
    if (d.shouldIgnore) return "Ignore — no business impact, no product angle, nothing to change.";
    const parts: string[] = [];
    if (d.complianceRisk) parts.push("compliance risk — update SOPs");
    if (d.competitiveAdvantage) parts.push("competitive edge — refresh positioning");
    if (d.productOpportunity) parts.push("product opportunity — brief the product agent");
    if (d.businessesAffected.length > 0) parts.push(`affects ${d.businessesAffected.join(", ")}`);
    const lead = d.shouldTest ? "Act and test" : "Act";
    const review = d.addToStrategyReview === "none" ? "" : ` Add to ${d.addToStrategyReview} strategy review.`;
    return `${lead}: ${parts.join("; ")}.${review}`.trim();
  }
}
