import {
  AnalyzeAudienceInputSchema,
  AudienceProfileSchema,
  type AnalyzeAudienceInput,
  type AudienceSignal,
  type AudienceProfile,
} from "@alfy2/shared";

/**
 * Audience Intelligence (docs/adr/ADR-0081-audience-intelligence.md). Distills an audience profile from raw
 * signals (questions, comments, DMs, emails, sales calls, customer feedback, podcast feedback, website
 * searches, support tickets) using deterministic keyword heuristics: biggest fears, biggest goals, language
 * used, objections, desires, misconceptions, favorite content, best offers, plus the single highest-impact
 * messaging change. Re-analyzing the same audience UPSERTS by merging signals into one profile.
 * Deterministic, tenant-scoped.
 */

const FEAR_WORDS = ["worried", "afraid", "scared", "risk", "risky", "fail", "failure", "lose", "losing", "anxious", "nervous", "concern"];
const GOAL_WORDS = ["want", "goal", "hope", "aim", "achieve", "wish", "trying to", "need to", "looking to"];
const DESIRE_WORDS = ["love", "wish", "dream", "ideal", "perfect", "desire", "would love", "really want"];
const OBJECTION_WORDS = ["but", "expensive", "too", "however", "not sure", "doubt", "cost", "price", "can't afford", "hesitant"];

export class AudienceIntelligence {
  private readonly profiles = new Map<string, AudienceProfile>();
  /** Raw signals retained per profile id so re-analysis can merge. */
  private readonly signalStore = new Map<string, AudienceSignal[]>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Analyze (or re-analyze, merging) an audience from its signals. */
  analyze(tenantId: string, input: AnalyzeAudienceInput): AudienceProfile {
    const i = AnalyzeAudienceInputSchema.parse(input);
    const now = this.clock().toISOString();

    const existing = this.find(tenantId, i.audience_name);
    const signals = [...(existing ? this.signalStore.get(existing.id) ?? [] : []), ...i.signals];

    const fears = this.match(signals, (t) => containsAny(t, FEAR_WORDS));
    const goals = this.match(signals, (t) => containsAny(t, GOAL_WORDS));
    const desires = this.match(signals, (t) => containsAny(t, DESIRE_WORDS));
    const objections = this.match(signals, (t) => containsAny(t, OBJECTION_WORDS));
    // Questions reveal misconceptions: anything ending in "?" or starting interrogatively.
    const misconceptions = this.match(signals, (t) => t.trim().endsWith("?") || /^(how|why|what|is|are|does|do|can|will)\b/i.test(t.trim()));
    const language = dedupe(signals.flatMap((s) => keyPhrases(s.text))).slice(0, 8);
    // Favorite content / best offers derive from the channels that produced engagement.
    const favorite = dedupe(
      signals
        .filter((s) => s.kind === "comment" || s.kind === "podcast_feedback" || s.kind === "customer_feedback")
        .map((s) => `Content like: "${truncate(s.text)}"`),
    ).slice(0, 5);
    const offers = this.offers(goals, objections, desires);

    const id = existing?.id ?? this.newId();
    const createdAt = existing?.created_at ?? now;

    const profile = AudienceProfileSchema.parse({
      id,
      tenant_id: tenantId,
      audience_name: i.audience_name,
      business_id: i.business_id ?? existing?.business_id ?? null,
      biggest_fears: fears.slice(0, 5),
      biggest_goals: goals.slice(0, 5),
      language_used: language,
      objections: objections.slice(0, 5),
      desires: desires.slice(0, 5),
      misconceptions: misconceptions.slice(0, 5),
      favorite_content: favorite,
      best_offers: offers,
      messaging_recommendation: this.recommendation(fears, goals, objections, desires),
      signal_count: signals.length,
      updated_at: now,
      created_at: createdAt,
    });

    // Retain the raw signals (keyed by profile id) so re-analysis can merge them.
    this.profiles.set(id, profile);
    this.signalStore.set(id, signals);
    return profile;
  }

  get(tenantId: string, audienceName: string): AudienceProfile | undefined {
    return this.find(tenantId, audienceName);
  }

  list(tenantId: string): AudienceProfile[] {
    return [...this.profiles.values()].filter((p) => p.tenant_id === tenantId);
  }

  // --- internals ---

  private find(tenantId: string, audienceName: string): AudienceProfile | undefined {
    return [...this.profiles.values()].find(
      (p) => p.tenant_id === tenantId && p.audience_name === audienceName,
    );
  }

  private match(signals: AudienceSignal[], pred: (text: string) => boolean): string[] {
    return dedupe(signals.filter((s) => pred(s.text.toLowerCase())).map((s) => truncate(s.text)));
  }

  private offers(goals: string[], objections: string[], desires: string[]): string[] {
    const out: string[] = [];
    if (objections.some((o) => /expensive|cost|price|afford/i.test(o))) out.push("A lower-risk entry offer (payment plan or trial) to defuse price objections");
    if (goals.length) out.push("An outcome-guaranteed package tied to their stated goal");
    if (desires.length) out.push("A premium 'done-for-you' offer matching their ideal scenario");
    if (out.length === 0) out.push("A clear flagship offer with proof and a simple next step");
    return out;
  }

  private recommendation(fears: string[], goals: string[], objections: string[], desires: string[]): string {
    if (objections.length) return `Lead by directly addressing the top objection: "${objections[0]}" — name it before they do.`;
    if (fears.length) return `Open with the biggest fear ("${fears[0]}") and show how you remove it.`;
    if (desires.length) return `Anchor messaging on their stated desire: "${desires[0]}".`;
    if (goals.length) return `Frame every message around their goal: "${goals[0]}".`;
    return "Gather more direct audience signals before changing core messaging.";
  }
}

const containsAny = (text: string, words: string[]): boolean => words.some((w) => text.includes(w));

const truncate = (text: string, max = 140): string => {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
};

const keyPhrases = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length >= 5);

const dedupe = (items: string[]): string[] => [...new Set(items)];
