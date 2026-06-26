import {
  DetectPrInputSchema,
  PrOpportunitySchema,
  AuthorityAssetSchema,
  type DetectPrInput,
  type PrOpportunity,
  type PrTrigger,
  type AuthorityAsset,
  type AuthorityAssetKind,
} from "@alfy2/shared";

/**
 * PR & Authority Engine (docs/adr/ADR-0080-pr-authority.md). Automatically identifies PR opportunities from
 * company launches, partnerships, funding, customer wins, industry trends, and technology innovations,
 * generating an angle, target outlets, and a drafted pitch for approval — pitches are never sent without
 * explicit approval. Also assembles authority assets (media kit, speaker kit, bios, press releases, award
 * submissions, podcast / conference pitches, guest articles, case studies, thought leadership, credibility
 * assets). Deterministic, tenant-scoped.
 */

export class PrAuthorityError extends Error {}

/** A sink that persists / fans out an authority asset; default is in-memory and returns a stable id. */
export type AuthorityAssetSink = (asset: Omit<AuthorityAsset, "asset_id">) => string;

/** Priority order for ranking opportunities by trigger (highest first). */
const TRIGGER_PRIORITY: Record<PrTrigger, number> = {
  funding: 6,
  major_partnership: 5,
  company_launch: 4,
  customer_win: 3,
  industry_trend: 2,
  technology_innovation: 1,
};

/** Deterministic target outlets per trigger. */
const OUTLETS: Record<PrTrigger, string[]> = {
  funding: ["TechCrunch", "Fortune Term Sheet", "PitchBook", "Axios Pro Rata"],
  major_partnership: ["Business Wire", "Trade press for both categories", "Partner co-marketing channels"],
  company_launch: ["Product Hunt", "TechCrunch", "Category trade press", "Hacker News"],
  customer_win: ["Trade press", "Case-study channels", "Customer's industry newsletter"],
  industry_trend: ["Industry analyst blogs", "Op-ed desks", "Newsletter columnists"],
  technology_innovation: ["The Verge", "Ars Technica", "Engineering & R&D press"],
};

/** Credibility assets each trigger typically needs to be taken seriously. */
const ASSETS_NEEDED: Record<PrTrigger, string[]> = {
  funding: ["founder_bio", "company_bio", "press_release"],
  major_partnership: ["press_release", "company_bio", "case_study"],
  company_launch: ["press_release", "media_kit", "founder_bio"],
  customer_win: ["case_study", "company_bio"],
  industry_trend: ["thought_leadership", "founder_bio"],
  technology_innovation: ["media_kit", "thought_leadership", "company_bio"],
};

export class PrAuthorityEngine {
  private readonly opportunities = new Map<string, PrOpportunity>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly sink: AuthorityAssetSink;

  constructor(options: { clock?: () => Date; idFactory?: () => string; assetSink?: AuthorityAssetSink } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.sink = options.assetSink ?? defaultSink;
  }

  /** Detect a PR opportunity and draft an (un-sent) pitch. */
  detect(tenantId: string, input: DetectPrInput): PrOpportunity {
    const i = DetectPrInputSchema.parse(input);
    const now = this.clock().toISOString();
    const business = i.business_name || "the company";

    const opp = PrOpportunitySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      trigger: i.trigger,
      headline: i.headline,
      business_name: i.business_name,
      angle: this.angle(i.trigger, i.headline, business),
      target_outlets: OUTLETS[i.trigger],
      drafted_pitch: this.pitch(i, business),
      credibility_assets_needed: ASSETS_NEEDED[i.trigger],
      status: "identified",
      approved_to_send: false,
      created_at: now,
      updated_at: now,
    });

    this.opportunities.set(opp.id, opp);
    return opp;
  }

  /** Approve an opportunity's pitch for sending. */
  approve(tenantId: string, id: string): PrOpportunity {
    const cur = this.require(tenantId, id);
    const next = PrOpportunitySchema.parse({
      ...cur,
      approved_to_send: true,
      status: "approved",
      updated_at: this.clock().toISOString(),
    });
    this.opportunities.set(next.id, next);
    return next;
  }

  /** Mark a pitch sent — only permitted once approved. */
  markSent(tenantId: string, id: string): PrOpportunity {
    const cur = this.require(tenantId, id);
    if (!cur.approved_to_send) {
      throw new PrAuthorityError(`Opportunity ${id} is not approved to send.`);
    }
    const next = PrOpportunitySchema.parse({
      ...cur,
      status: "sent",
      updated_at: this.clock().toISOString(),
    });
    this.opportunities.set(next.id, next);
    return next;
  }

  /** Assemble an authority asset via the configured sink. */
  buildAuthorityAsset(tenantId: string, kind: AuthorityAssetKind, title: string, assetSink?: AuthorityAssetSink): AuthorityAsset {
    const sink = assetSink ?? this.sink;
    const draft = { kind, title, outline: this.outline(kind) };
    const assetId = sink({ ...draft });
    return AuthorityAssetSchema.parse({ ...draft, asset_id: assetId });
  }

  get(tenantId: string, id: string): PrOpportunity | undefined {
    const o = this.opportunities.get(id);
    return o && o.tenant_id === tenantId ? o : undefined;
  }

  list(tenantId: string): PrOpportunity[] {
    return [...this.opportunities.values()].filter((o) => o.tenant_id === tenantId);
  }

  /** Opportunities ranked by trigger priority (funding > partnership > launch > win > trend > innovation). */
  ranked(tenantId: string): PrOpportunity[] {
    return this.list(tenantId).sort(
      (a, b) => TRIGGER_PRIORITY[b.trigger] - TRIGGER_PRIORITY[a.trigger] || a.headline.localeCompare(b.headline),
    );
  }

  // --- internals ---

  private angle(trigger: PrTrigger, headline: string, business: string): string {
    switch (trigger) {
      case "funding": return `Why ${business} raised now: ${headline} — and what the capital unlocks.`;
      case "major_partnership": return `${business} + partner: ${headline} reshapes the category.`;
      case "company_launch": return `${business} launches: ${headline} — the problem it finally solves.`;
      case "customer_win": return `How ${business} delivered: ${headline} — a proof-point story.`;
      case "industry_trend": return `${business}'s take on ${headline}: where the industry is heading.`;
      case "technology_innovation": return `Under the hood at ${business}: ${headline} and why it matters.`;
    }
  }

  private pitch(i: DetectPrInput, business: string): string {
    const detail = i.detail ? ` ${i.detail}` : "";
    return [
      `Hi {{editor}},`,
      `I'm reaching out about ${business}: ${i.headline}.${detail}`,
      `Angle: ${this.angle(i.trigger, i.headline, business)}`,
      `Happy to provide an exclusive, data, and an interview. Would this fit your readers?`,
    ].join("\n");
  }

  private outline(kind: AuthorityAssetKind): string[] {
    switch (kind) {
      case "media_kit": return ["Company overview", "Boilerplate", "Logos & brand assets", "Press contact", "Recent coverage"];
      case "speaker_kit": return ["Speaker bio", "Signature talks", "Past stages", "Headshots", "Booking contact"];
      case "founder_bio": return ["One-line", "Short bio", "Long bio", "Notable milestones"];
      case "company_bio": return ["What we do", "Who we serve", "Traction", "Boilerplate"];
      case "press_release": return ["Headline", "Dateline", "Lede", "Quotes", "Boilerplate", "Contact"];
      case "award_submission": return ["Eligibility", "Impact narrative", "Metrics", "Supporting evidence"];
      case "podcast_pitch": return ["Why now", "Talking points", "Guest bio", "Sample questions"];
      case "conference_submission": return ["Session title", "Abstract", "Takeaways", "Speaker bio"];
      case "guest_article": return ["Hook", "Thesis", "Argument", "Proof", "CTA"];
      case "case_study": return ["Challenge", "Solution", "Results", "Quote"];
      case "thought_leadership": return ["Contrarian thesis", "Evidence", "Implications", "Call to action"];
      case "credibility_asset": return ["Claim", "Proof", "Third-party validation"];
    }
  }

  private require(tenantId: string, id: string): PrOpportunity {
    const o = this.get(tenantId, id);
    if (!o) throw new PrAuthorityError(`No PR opportunity ${id} in tenant ${tenantId}.`);
    return o;
  }
}

const defaultSink: AuthorityAssetSink = (asset) => `asset:${asset.kind}:${asset.title}`;
