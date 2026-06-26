import type { CampaignType, VariantDraft, CampaignSuccessMetric } from "@alfy2/shared";

/**
 * Per-type defaults for Campaign Intelligence: a starting A/B variant pair and a default primary
 * success metric for each campaign type. Used when the caller does not supply their own. Deterministic.
 */

interface CampaignTemplate {
  variantA: VariantDraft;
  variantB: VariantDraft;
  primaryMetric: { name: string; target: number };
}

export const CAMPAIGN_TEMPLATES: Record<CampaignType, CampaignTemplate> = {
  email: {
    variantA: { name: "Direct offer", hypothesis: "A blunt, benefit-first offer converts best.", content: "" },
    variantB: { name: "Story-led", hypothesis: "A short customer story converts best.", content: "" },
    primaryMetric: { name: "conversion_rate", target: 0.05 },
  },
  social: {
    variantA: { name: "Hook-first", hypothesis: "A provocative hook drives the most engagement.", content: "" },
    variantB: { name: "Value-first", hypothesis: "Leading with a concrete tip drives the most engagement.", content: "" },
    primaryMetric: { name: "engagement_rate", target: 0.04 },
  },
  landing_page: {
    variantA: { name: "Benefit headline", hypothesis: "A benefit headline converts best.", content: "" },
    variantB: { name: "Outcome headline", hypothesis: "An outcome/transformation headline converts best.", content: "" },
    primaryMetric: { name: "conversion_rate", target: 0.1 },
  },
  funnel: {
    variantA: { name: "Short funnel", hypothesis: "Fewer steps lift completion.", content: "" },
    variantB: { name: "Educational funnel", hypothesis: "A teaching step lifts completion.", content: "" },
    primaryMetric: { name: "completion_rate", target: 0.2 },
  },
  outreach: {
    variantA: { name: "Case-study lead", hypothesis: "Leading with proof books more calls.", content: "" },
    variantB: { name: "Question lead", hypothesis: "Leading with a question books more calls.", content: "" },
    primaryMetric: { name: "reply_rate", target: 0.15 },
  },
  lead_nurturing: {
    variantA: { name: "Cadence-heavy", hypothesis: "More frequent touches convert leads faster.", content: "" },
    variantB: { name: "Value-drip", hypothesis: "Fewer, higher-value touches convert leads faster.", content: "" },
    primaryMetric: { name: "conversion_rate", target: 0.06 },
  },
};

/** The default primary success metric for a campaign type. */
export function defaultMetric(type: CampaignType): CampaignSuccessMetric {
  const m = CAMPAIGN_TEMPLATES[type].primaryMetric;
  return { name: m.name, target: m.target, unit: "ratio", direction: "higher_better", primary: true };
}
