import type {
  Campaign,
  CampaignMetricsInput,
  CampaignReport,
  VariantResult,
  VariantKey,
  CampaignRecommendation,
  VariantObservation,
} from "@alfy2/shared";

/**
 * Automatic reporting + improvement recommendations for Campaign Intelligence. Turns raw per-variant
 * observations into conversion rates, picks the A/B winner, computes the lift, and generates
 * deterministic improvement recommendations. No AI.
 */

const round4 = (n: number): number => Math.round(n * 10000) / 10000;
const rate = (conv: number, imp: number): number => (imp > 0 ? round4(conv / imp) : 0);

/** Minimum conversions across the pair before a winner is called (avoid noise). */
const MIN_CONVERSIONS_FOR_WINNER = 20;

export function toResults(obs: VariantObservation[]): VariantResult[] {
  return obs.map((o) => ({
    variant_key: o.variant_key,
    impressions: o.impressions,
    conversions: o.conversions,
    conversion_rate: rate(o.conversions, o.impressions),
    cost_usd: o.cost_usd,
    revenue_usd: o.revenue_usd,
  }));
}

/** Pick the winning variant by conversion rate, with the relative lift over the other. */
export function pickWinner(results: VariantResult[]): { winner: VariantKey | null; lift: number | null } {
  const a = results.find((r) => r.variant_key === "A");
  const b = results.find((r) => r.variant_key === "B");
  if (!a || !b) return { winner: null, lift: null };
  const totalConversions = a.conversions + b.conversions;
  if (totalConversions < MIN_CONVERSIONS_FOR_WINNER) return { winner: null, lift: null };
  if (a.conversion_rate === b.conversion_rate) return { winner: null, lift: null };
  const [hi, lo] = a.conversion_rate > b.conversion_rate ? [a, b] : [b, a];
  const lift = lo.conversion_rate > 0 ? round4((hi.conversion_rate - lo.conversion_rate) / lo.conversion_rate) : null;
  return { winner: hi.variant_key, lift };
}

function recommend(
  campaign: Campaign,
  results: VariantResult[],
  winner: VariantKey | null,
  lift: number | null,
): CampaignRecommendation[] {
  const recs: CampaignRecommendation[] = [];
  if (winner) {
    const loser = winner === "A" ? "B" : "A";
    recs.push({
      description: `Shift traffic toward Variant ${winner}.`,
      rationale: `Variant ${winner} converts ${lift !== null ? `${Math.round(lift * 100)}% ` : ""}better.`,
      expected_impact: lift !== null && lift >= 0.2 ? "high" : "medium",
    });
    const loserVariant = campaign.variants.find((v) => v.key === loser);
    recs.push({
      description: `Iterate Variant ${loser}'s hypothesis or retire it.`,
      rationale: `"${loserVariant?.hypothesis ?? loser}" is underperforming the winner.`,
      expected_impact: "medium",
    });
  } else {
    recs.push({
      description: "Keep both variants running and gather more data.",
      rationale: "No statistically meaningful winner yet (insufficient conversions or a tie).",
      expected_impact: "low",
    });
  }
  // Type-aware tip.
  recs.push({
    description: typeTip(campaign.type),
    rationale: `Standard lever for ${campaign.type.replace("_", " ")} campaigns.`,
    expected_impact: "medium",
  });
  return recs;
}

function typeTip(type: Campaign["type"]): string {
  switch (type) {
    case "email":
      return "Test the subject line next — it moves open rate the most.";
    case "social":
      return "Test the first three seconds / opening line of the creative.";
    case "landing_page":
      return "Test the primary call-to-action placement and copy.";
    case "funnel":
      return "Find and fix the highest-drop step before adding traffic.";
    case "outreach":
      return "Test the opening line and a single, specific call-to-action.";
    case "lead_nurturing":
      return "Test send cadence and the first-touch value piece.";
  }
}

/** Build a full report from observed metrics. */
export function buildReport(
  campaign: Campaign,
  metrics: CampaignMetricsInput,
  now: Date,
): CampaignReport {
  const variant_results = toResults(metrics.results);
  const { winner, lift } = pickWinner(variant_results);
  const recommendations = recommend(campaign, variant_results, winner, lift);
  const summary = winner
    ? `Variant ${winner} leads${lift !== null ? ` with a ${Math.round(lift * 100)}% lift` : ""} on ${primaryName(campaign)}.`
    : `No clear winner yet on ${primaryName(campaign)}; keep gathering data.`;
  return {
    generated_at: now.toISOString(),
    period_label: metrics.period_label,
    variant_results,
    winner,
    lift,
    summary,
    recommendations,
  };
}

function primaryName(campaign: Campaign): string {
  return (campaign.success_metrics.find((m) => m.primary) ?? campaign.success_metrics[0]!).name;
}

/** Best (highest) conversion rate across variants in a report — the campaign's current performance. */
export function bestConversionRate(results: VariantResult[]): number {
  return results.reduce((max, r) => Math.max(max, r.conversion_rate), 0);
}
