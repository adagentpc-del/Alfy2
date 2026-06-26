import {
  VisibilityInputSchema,
  VisibilityReportSchema,
  type VisibilityInput,
  type VisibilitySignals,
  type VisibilityReport,
} from "@alfy2/shared";

/**
 * Visibility Engine (docs/adr/ADR-0079-visibility-engine.md). Computes a per-business 0..1 Visibility
 * Score from normalized signals (posting frequency, reach, engagement, follower / podcast / email growth,
 * website traffic, SEO, mentions, backlinks, podcast & speaking invitations, media mentions, partnerships)
 * and emits deterministic recommendations: where / what / when to post, collaborators, podcasts to appear
 * on, conferences to speak at, and awards to apply for — all shaped by which signals are weak. Deterministic,
 * tenant-scoped.
 */

/** Reference ceilings used to normalize raw-count signals into 0..1 via min(x / REF, 1). */
const REF = {
  posting_frequency_per_week: 7,
  reach: 50_000,
  website_traffic: 25_000,
  mentions: 50,
  backlinks: 200,
  podcast_invitations: 10,
  speaking_invitations: 10,
  media_mentions: 20,
  partnerships: 15,
} as const;

/** Weights for the composite score; sum to 1. */
const WEIGHT = {
  posting_frequency: 0.08,
  reach: 0.12,
  engagement_rate: 0.14,
  follower_growth: 0.12,
  podcast_growth: 0.06,
  email_growth: 0.08,
  website_traffic: 0.1,
  seo_score: 0.1,
  mentions: 0.05,
  backlinks: 0.05,
  podcast_invitations: 0.03,
  speaking_invitations: 0.03,
  media_mentions: 0.02,
  partnerships: 0.02,
} as const;

type SignalName = keyof typeof WEIGHT;

export class VisibilityEngine {
  private readonly reports = new Map<string, VisibilityReport>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Score a business's visibility and emit recommendations from its signals. */
  report(tenantId: string, input: VisibilityInput): VisibilityReport {
    const i = VisibilityInputSchema.parse(input);
    const n = this.normalize(i.signals);

    const visibilityScore = round(
      (Object.keys(WEIGHT) as SignalName[]).reduce((sum, name) => sum + n[name] * WEIGHT[name], 0),
    );

    // The three lowest-normalized signal names drive the recommendations.
    const weakest = (Object.keys(n) as SignalName[])
      .sort((a, b) => n[a] - n[b] || a.localeCompare(b))
      .slice(0, 3);
    const weak = new Set(weakest);

    const report = VisibilityReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_name: i.business_name,
      visibility_score: visibilityScore,
      where_to_post: this.whereToPost(n, weak),
      what_to_post: this.whatToPost(weak),
      when_to_post: this.whenToPost(n),
      collaborators: this.collaborators(weak),
      podcasts_to_appear_on: this.podcasts(weak),
      conferences_to_speak_at: this.conferences(weak),
      awards_to_apply_for: this.awards(weak),
      weakest_signals: weakest,
      created_at: this.clock().toISOString(),
    });

    this.reports.set(report.id, report);
    return report;
  }

  get(tenantId: string, id: string): VisibilityReport | undefined {
    const r = this.reports.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): VisibilityReport[] {
    return [...this.reports.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- internals ---

  /** Each signal normalized to 0..1: 0..1 signals pass through; counts use min(x / REF, 1). */
  private normalize(s: VisibilitySignals): Record<SignalName, number> {
    return {
      posting_frequency: clamp01(s.posting_frequency_per_week / REF.posting_frequency_per_week),
      reach: clamp01(s.reach / REF.reach),
      engagement_rate: clamp01(s.engagement_rate),
      follower_growth: clamp01(s.follower_growth),
      podcast_growth: clamp01(s.podcast_growth),
      email_growth: clamp01(s.email_growth),
      website_traffic: clamp01(s.website_traffic / REF.website_traffic),
      seo_score: clamp01(s.seo_score),
      mentions: clamp01(s.mentions / REF.mentions),
      backlinks: clamp01(s.backlinks / REF.backlinks),
      podcast_invitations: clamp01(s.podcast_invitations / REF.podcast_invitations),
      speaking_invitations: clamp01(s.speaking_invitations / REF.speaking_invitations),
      media_mentions: clamp01(s.media_mentions / REF.media_mentions),
      partnerships: clamp01(s.partnerships / REF.partnerships),
    };
  }

  private whereToPost(n: Record<SignalName, number>, weak: Set<SignalName>): string[] {
    const out: string[] = [];
    if (weak.has("seo_score") || weak.has("website_traffic")) out.push("Your owned blog / long-form site (compounding SEO)");
    if (weak.has("engagement_rate")) out.push("LinkedIn (conversation-first posts)");
    if (weak.has("follower_growth")) out.push("X / short-form video where audiences grow fastest");
    if (weak.has("email_growth")) out.push("Your newsletter (capture before the algorithm)");
    if (n.reach < 0.5) out.push("Guest channels with existing reach");
    if (out.length === 0) out.push("Double down on your highest-engagement channel");
    return out;
  }

  private whatToPost(weak: Set<SignalName>): string[] {
    const out: string[] = [];
    if (weak.has("engagement_rate")) out.push("Strong-opinion posts and direct questions to spark replies");
    if (weak.has("seo_score")) out.push("Search-intent how-to guides targeting buyer keywords");
    if (weak.has("follower_growth") || weak.has("reach")) out.push("Shareable frameworks and contrarian takes");
    if (weak.has("email_growth")) out.push("Lead magnets and gated deep-dives");
    if (weak.has("mentions") || weak.has("media_mentions")) out.push("Original data and bold predictions journalists cite");
    if (out.length === 0) out.push("Customer-proof case studies and results stories");
    return out;
  }

  private whenToPost(n: Record<SignalName, number>): string {
    return n.posting_frequency < 0.5
      ? "Increase cadence to 3-5x/week; post weekday mornings (Tue-Thu) when reach peaks."
      : "Maintain your cadence; post weekday mornings (Tue-Thu) and test one weekend slot.";
  }

  private collaborators(weak: Set<SignalName>): string[] {
    const out: string[] = [];
    if (weak.has("reach") || weak.has("follower_growth")) out.push("Adjacent creators with larger but overlapping audiences");
    if (weak.has("partnerships")) out.push("Complementary (non-competing) brands for co-marketing");
    if (weak.has("backlinks")) out.push("Industry publishers open to co-authored content");
    if (out.length === 0) out.push("Peers for mutual amplification and joint launches");
    return out;
  }

  private podcasts(weak: Set<SignalName>): string[] {
    const out: string[] = [];
    if (weak.has("podcast_invitations") || weak.has("podcast_growth")) {
      out.push("Mid-tier niche shows in your category (high conversion, easy yes)");
      out.push("Founder / operator interview podcasts");
    }
    if (weak.has("reach")) out.push("Flagship industry shows for reach");
    if (out.length === 0) out.push("Top-tier shows to reinforce authority");
    return out;
  }

  private conferences(weak: Set<SignalName>): string[] {
    const out: string[] = [];
    if (weak.has("speaking_invitations")) {
      out.push("Regional meetups and community events (low barrier to a first talk)");
      out.push("Vertical conferences where your buyers gather");
    }
    if (weak.has("reach")) out.push("Flagship industry summits");
    if (out.length === 0) out.push("Keynote-tier conferences to cement authority");
    return out;
  }

  private awards(weak: Set<SignalName>): string[] {
    const out: string[] = [];
    if (weak.has("media_mentions") || weak.has("mentions")) out.push("Industry 'best of' and innovation awards for press coverage");
    if (weak.has("partnerships")) out.push("Regional business and growth awards");
    out.push("Category-specific excellence awards aligned to your strengths");
    return out;
  }
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
const round = (n: number): number => Math.round(n * 1000) / 1000;
