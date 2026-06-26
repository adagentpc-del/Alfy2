import {
  GeneratePrInputSchema,
  PrStrategySchema,
  type GeneratePrInput,
  type PrStrategy,
} from "@alfy2/shared";

/**
 * The PR Strategy Generator (docs/adr/ADR-0073-pr-department.md). PR is a standard department for every
 * business. For any business this deterministically produces a PR strategy — media angles, target
 * publications, podcast targets, a founder story angle, credibility proof, a press-kit checklist,
 * outreach templates, and reputation risks — from the business name, description, and industry.
 * Deterministic. Tenant-scoped.
 */

export class PrStrategyError extends Error {}

export interface PrStrategyGeneratorOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class PrStrategyGenerator {
  private readonly strategies = new Map<string, PrStrategy>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: PrStrategyGeneratorOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Generate a full PR strategy for a business. */
  generate(tenantId: string, input: GeneratePrInput): PrStrategy {
    const i = GeneratePrInputSchema.parse(input);
    const now = this.clock().toISOString();

    const biz = i.business_name;
    const founder = i.founder_name || "Alyssa DelTorre";
    const what = i.description || `what ${biz} does`;
    const industry = i.industry || "its category";

    const strategy = PrStrategySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_name: biz,
      business_id: i.business_id ?? null,
      media_angles: [
        `How ${biz} is reshaping ${industry}`,
        `The founder story behind ${biz}: ${what}`,
        `A contrarian take: what everyone in ${industry} gets wrong`,
        `${biz}'s data-backed prediction for ${industry} over the next 12 months`,
        `Behind the build: lessons from launching ${biz}`,
      ],
      target_publications: [
        `Top-tier trade press for ${industry}`,
        "TechCrunch / Forbes / Inc. (tier-1 business)",
        "Relevant niche newsletters and Substacks",
        "Local and regional business outlets",
        "Industry award and ranking publications",
      ],
      podcast_targets: [
        `Leading ${industry} podcasts`,
        "Founder / entrepreneurship shows",
        "Women-in-business and leadership podcasts",
        `Decoded with ${founder} (owned cross-promotion)`,
      ],
      founder_story_angle: `${founder} — former Miss United States turned AI architect and strategist — building ${biz} (${what}). A credibility-rich, against-the-grain story: pageant stage to ${industry} operator.`,
      credibility_proof: [
        `${founder}'s background: former Miss United States, AI architect and strategist`,
        `${biz} traction metrics and customer outcomes`,
        "Notable clients, partners, or design wins",
        "Awards, certifications, and speaking credits",
        "Press mentions and third-party validation",
      ],
      press_kit_checklist: [
        "Company one-pager / fact sheet",
        `Founder bio and high-res headshots of ${founder}`,
        "Logo pack and brand assets",
        "Boilerplate description",
        "Key statistics and milestones",
        "Quotable executive statements",
        "Product screenshots / demo links",
        "Media contact information",
      ],
      outreach_templates: [
        `Cold pitch to a ${industry} journalist (story-angle led)`,
        "Press release: launch announcement",
        "Podcast guest pitch for the founder",
        "Award / speaking submission template",
        "Follow-up nudge after no reply",
        "Exclusive offer to a tier-1 outlet",
      ],
      reputation_risks: [
        `Misalignment between ${biz}'s claims and delivered outcomes`,
        "Founder visibility outpacing the product story",
        "Negative reviews or unmanaged customer complaints",
        `Competitive or regulatory scrutiny in ${industry}`,
        "Inconsistent messaging across channels",
      ],
      created_at: now,
      updated_at: now,
    });

    this.strategies.set(strategy.id, strategy);
    return strategy;
  }

  get(tenantId: string, id: string): PrStrategy | undefined {
    const s = this.strategies.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  list(tenantId: string): PrStrategy[] {
    return [...this.strategies.values()].filter((s) => s.tenant_id === tenantId);
  }
}
