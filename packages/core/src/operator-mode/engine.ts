import {
  OperatorReviewInputSchema,
  OperatorReviewSchema,
  type OperatorReviewInput,
  type OperatorReview,
} from "@alfy2/shared";

/**
 * Billion-Dollar Operator Mode (docs/adr/ADR-0098-operator-mode.md). Evaluates every major
 * recommendation against enterprise-level discipline before the company reaches enterprise scale,
 * asking "Would this still make sense at $100M+/year?" It scores a hundred-million-dollar fit as a
 * weighted mean favouring scalability, compliance, long-term enterprise value, and delegation
 * potential, penalized by operational complexity, downside risk, and legal exposure — and when the
 * recommendation would not hold, it surfaces the cleaner, scalable version. Deterministic and pure:
 * the review is a pure function of its inputs (no tenant, no persistence).
 */

/** A scored dimension with the weight it carries toward the fit. */
interface Dimension {
  readonly label: string;
  readonly value: number;
  readonly weight: number;
  /** True when a high value hurts the fit (the value is inverted before weighting). */
  readonly penalty: boolean;
}

export class BillionDollarOperatorMode {
  /** The threshold at/above which a recommendation scales to $100M+. */
  private readonly passThreshold = 0.6;

  /**
   * Review a recommendation for $100M+ fit. Pure — takes no tenantId and persists nothing.
   */
  review(input: OperatorReviewInput): OperatorReview {
    const i = OperatorReviewInputSchema.parse(input);

    const dimensions: Dimension[] = [
      { label: "scalability", value: i.scalability, weight: 0.18, penalty: false },
      { label: "compliance", value: i.compliance, weight: 0.14, penalty: false },
      { label: "long-term enterprise value", value: i.long_term_enterprise_value, weight: 0.14, penalty: false },
      { label: "delegation potential", value: i.delegation_potential, weight: 0.12, penalty: false },
      { label: "financial upside", value: i.financial_upside, weight: 0.08, penalty: false },
      { label: "customer trust", value: i.customer_trust, weight: 0.06, penalty: false },
      { label: "reputation", value: i.reputation, weight: 0.05, penalty: false },
      { label: "cash impact", value: i.cash_impact, weight: 0.05, penalty: false },
      { label: "founder freedom", value: i.founder_freedom, weight: 0.04, penalty: false },
      { label: "operational complexity", value: i.operational_complexity, weight: 0.06, penalty: true },
      { label: "downside risk", value: i.downside_risk, weight: 0.05, penalty: true },
      { label: "legal exposure", value: i.legal_exposure, weight: 0.03, penalty: true },
    ];

    // Weighted mean: penalty dimensions contribute their inverse, so the fit is high only when the
    // good dimensions are high AND the penalty dimensions are low. Weights sum to 1.0.
    const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
    const fit = dimensions.reduce((s, d) => {
      const contribution = d.penalty ? 1 - d.value : d.value;
      return s + contribution * d.weight;
    }, 0) / totalWeight;

    const hundredMFit = clamp01(round(fit));
    const passes = hundredMFit >= this.passThreshold;

    // Weaknesses are the dimensions dragging the fit down: low good dimensions and high penalties.
    const weaknesses = dimensions
      .filter((d) => (d.penalty ? d.value >= 0.5 : d.value < 0.5))
      .sort((a, b) => effectiveDrag(b) - effectiveDrag(a))
      .map((d) =>
        d.penalty
          ? `${d.label} too high (${round(d.value)})`
          : `${d.label} too low (${round(d.value)})`,
      );

    const scalableVersion = passes
      ? ""
      : `Cleaner scalable version of "${i.recommendation}": ${this.scalableTemplate(weaknesses)}`;

    const verdict = passes
      ? "Scales to $100M+."
      : "Would not hold at $100M+ — use the scalable version.";

    return OperatorReviewSchema.parse({
      recommendation: i.recommendation,
      hundred_m_fit: hundredMFit,
      passes,
      weaknesses,
      scalable_version: scalableVersion,
      verdict,
    });
  }

  /** Templated prescription for the scalable rebuild, keyed off the worst weaknesses. */
  private scalableTemplate(weaknesses: readonly string[]): string {
    const focus = weaknesses.slice(0, 3).join("; ") || "tighten the operating model";
    return (
      `systematize it so it runs without the founder, document the SOP for delegation, ` +
      `close the compliance and legal gaps before scaling, and only then turn it up. ` +
      `Address first: ${focus}.`
    );
  }
}

/** How much a dimension drags the fit, for ordering weaknesses. */
const effectiveDrag = (d: Dimension): number => (d.penalty ? d.value : 1 - d.value) * d.weight;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
