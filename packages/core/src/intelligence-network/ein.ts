import {
  ArticleInputSchema,
  ArticleScoresSchema,
  BriefingTimelineEntrySchema,
  IntelligenceItemSchema,
  LivingBriefingSchema,
  type ArticleInput,
  type ArticleScores,
  type IntelClassification,
  type IntelligenceItem,
  type LivingBriefing,
} from "@alfy2/shared";

/**
 * The Executive Intelligence Network (docs/adr/ADR-0067-intelligence-network.md). Continuously turns
 * external information into actionable executive intelligence — not summaries. Each article is scored
 * across ten dimensions and classified (ignore / interesting / monitor / research / immediate_action);
 * each item states why it matters, which businesses it affects, immediate actions, future implications,
 * confidence, sources, and follow-ups. Developing stories roll into ONE living briefing with a timeline,
 * so the same story is never reread. Deterministic. Tenant-scoped.
 */

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;

const splitSentences = (text: string): string[] =>
  text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 0);

/** The ten 0..1 score fields (reading-time is handled separately). */
const SCORE_FIELDS = [
  "importance",
  "urgency",
  "opportunity",
  "risk",
  "revenue_potential",
  "innovation",
  "implementation_difficulty",
  "compliance_risk",
  "strategic_value",
  "long_term_impact",
] as const;

export class ExecutiveIntelligenceNetwork {
  private readonly items = new Map<string, IntelligenceItem>();
  private readonly briefings = new Map<string, LivingBriefing>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Assess an article into an actionable intelligence item, rolling developing stories into briefings. */
  assess(tenantId: string, input: ArticleInput): IntelligenceItem {
    const a = ArticleInputSchema.parse(input);
    const now = this.clock().toISOString();
    const sentences = splitSentences(a.body);

    const scores = this.scoreArticle(a);
    const classification = this.classify(scores);
    const businesses_affected = a.businesses.filter((b) =>
      b.length > 0 && a.body.toLowerCase().includes(b.toLowerCase()),
    );

    const executive_summary = sentences[0] ?? a.title;
    const deep_dive = sentences.slice(0, 4).join(" ");
    const why_it_matters = this.whyItMatters(scores, businesses_affected);
    const immediate_actions = this.actionsFor(classification, businesses_affected);
    const future_implications = this.implicationsFor(scores);
    const agents_to_notify = [
      "intel.monitor",
      ...businesses_affected.map((b) => `business.${slug(b)}`),
    ];
    const confidence = round(
      (scores.importance + scores.strategic_value + (1 - scores.implementation_difficulty)) / 3,
    );
    const sources = [a.source, a.url].filter((s) => s.length > 0).slice(0, 1);
    const follow_up_recommendations = this.followUps(classification, scores);

    const related_briefing_id = a.story_key.length > 0
      ? this.upsertBriefing(tenantId, a, businesses_affected, now)
      : null;

    const item = IntelligenceItemSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      title: a.title,
      executive_summary,
      deep_dive,
      why_it_matters,
      businesses_affected,
      goals_affected: [],
      agents_to_notify,
      immediate_actions,
      future_implications,
      scores,
      classification,
      confidence,
      sources,
      related_briefing_id,
      follow_up_recommendations,
      created_at: now,
    });
    this.items.set(item.id, item);
    return item;
  }

  get(tenantId: string, id: string): IntelligenceItem | undefined {
    const i = this.items.get(id);
    return i && i.tenant_id === tenantId ? i : undefined;
  }

  list(tenantId: string): IntelligenceItem[] {
    return [...this.items.values()].filter((i) => i.tenant_id === tenantId);
  }

  /** Every living briefing for a tenant. */
  livingBriefings(tenantId: string): LivingBriefing[] {
    return [...this.briefings.values()].filter((b) => b.tenant_id === tenantId);
  }

  /** The living briefing for a specific story key, if any. */
  briefingFor(tenantId: string, storyKey: string): LivingBriefing | undefined {
    return this.briefings.get(this.briefingKey(tenantId, storyKey));
  }

  // --- internals ---

  private scoreArticle(a: ArticleInput): ArticleScores {
    const base: Record<string, number> = {};
    for (const field of SCORE_FIELDS) {
      base[field] = clamp01(a.signals[field] ?? 0.5);
    }
    const recommended_reading_minutes =
      a.signals.recommended_reading_minutes ?? clamp(a.body.length / 1000, 1, 15);
    return ArticleScoresSchema.parse({ ...base, recommended_reading_minutes });
  }

  private classify(s: ArticleScores): IntelClassification {
    if (s.urgency >= 0.8 && s.risk >= 0.7) return "immediate_action";
    const w =
      s.importance * 0.3 +
      s.urgency * 0.2 +
      s.opportunity * 0.15 +
      s.revenue_potential * 0.15 +
      s.strategic_value * 0.2;
    if (w < 0.2) return "ignore";
    if (w < 0.4) return "interesting";
    if (w < 0.6) return "monitor";
    if (w < 0.8) return "research";
    return "immediate_action";
  }

  private whyItMatters(s: ArticleScores, businesses: string[]): string {
    const drivers: string[] = [];
    if (s.revenue_potential >= 0.6) drivers.push("revenue potential");
    if (s.risk >= 0.6) drivers.push("downside risk");
    if (s.opportunity >= 0.6) drivers.push("a clear opportunity");
    if (s.strategic_value >= 0.6) drivers.push("strategic value");
    const lead = drivers.length > 0 ? `It carries ${drivers.join(", ")}` : "It is worth tracking";
    const tail = businesses.length > 0 ? ` and directly touches ${businesses.join(", ")}.` : ".";
    return `${lead}${tail}`;
  }

  private actionsFor(c: IntelClassification, businesses: string[]): string[] {
    const target = businesses.length > 0 ? businesses.join(", ") : "the relevant team";
    switch (c) {
      case "immediate_action":
        return [`Act now on this for ${target}.`, "Brief the executive and assign an owner today."];
      case "research":
        return [`Open a research task scoped to ${target}.`];
      case "monitor":
        return ["Add to the watchlist and set a check-in."];
      case "interesting":
        return ["Note for future reference."];
      case "ignore":
      default:
        return [];
    }
  }

  private implicationsFor(s: ArticleScores): string[] {
    const out: string[] = [];
    if (s.long_term_impact >= 0.6) out.push("Likely to shape the market over the long term.");
    if (s.innovation >= 0.6) out.push("Signals an innovation worth positioning around.");
    if (s.compliance_risk >= 0.6) out.push("May introduce compliance obligations to prepare for.");
    if (out.length === 0) out.push("Limited long-term implications at this time.");
    return out;
  }

  private followUps(c: IntelClassification, s: ArticleScores): string[] {
    const out: string[] = [];
    if (c === "immediate_action" || c === "research") out.push("Schedule a follow-up review in one week.");
    if (s.revenue_potential >= 0.6) out.push("Explore a monetization angle.");
    if (out.length === 0) out.push("Re-evaluate if the story develops.");
    return out;
  }

  private upsertBriefing(
    tenantId: string,
    a: ArticleInput,
    businesses: string[],
    now: string,
  ): string {
    const key = this.briefingKey(tenantId, a.story_key);
    const existing = this.briefings.get(key);
    if (existing) {
      const entry = BriefingTimelineEntrySchema.parse({ at: now, headline: a.title });
      const mergedBusinesses = [...new Set([...existing.businesses_affected, ...businesses])];
      const updated = LivingBriefingSchema.parse({
        ...existing,
        current_state: a.title,
        timeline: [...existing.timeline, entry],
        businesses_affected: mergedBusinesses,
        updated_at: now,
      });
      this.briefings.set(key, updated);
      return updated.id;
    }
    const created = LivingBriefingSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      story_key: a.story_key,
      title: a.title,
      current_state: a.title,
      timeline: [BriefingTimelineEntrySchema.parse({ at: now, headline: a.title })],
      businesses_affected: businesses,
      updated_at: now,
      created_at: now,
    });
    this.briefings.set(key, created);
    return created.id;
  }

  private briefingKey(tenantId: string, storyKey: string): string {
    return `${tenantId}|${storyKey}`;
  }
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "unit";
