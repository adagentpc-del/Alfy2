import {
  VoiceOfCustomerInsightSchema,
  RecordVocInputSchema,
  MarketGapSchema,
  DetectMarketGapInputSchema,
  AiVisibilityScoreSchema,
  ScoreAiVisibilityInputSchema,
  type VoiceOfCustomerInsight,
  type RecordVocInput,
  type MarketGap,
  type DetectMarketGapInput,
  type AiVisibilitySignals,
  type AiVisibilityScore,
  type ScoreAiVisibilityInput,
} from "@alfy2/shared";

/**
 * Market Intelligence engine — Voice-of-Customer + Market Gaps + AI-Search / reputation (AEO) scoring.
 *
 * Deterministic and infrastructure-free (in-memory append-only reference store; real persistence +
 * AI-assisted extraction arrive in Phase 2 behind the AI Gateway flag). All three records are
 * append-only, mirroring the Supabase tables (market_voc_insights, market_gaps, market_ai_visibility).
 *
 * The three 0–100 scores are computed from weighted signal groups; the missing_* / recommended_*
 * lists are derived from any signal below {@link WEAK_SIGNAL_THRESHOLD}.
 */

export interface MarketIntelEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

/** A signal at or below this value is treated as weak (drives missing_* / recommended_* output). */
export const WEAK_SIGNAL_THRESHOLD = 0.5;

interface Stores {
  voc: Map<string, VoiceOfCustomerInsight>;
  gaps: Map<string, MarketGap>;
  visibility: Map<string, AiVisibilityScore>;
}

/** Which weighted group each signal contributes to, with its weight in that group. */
const AI_VISIBILITY_GROUP: ReadonlyArray<[keyof AiVisibilitySignals, number]> = [
  ["entity_consistency", 1],
  ["website_clarity", 1],
  ["schema_markup", 1],
  ["faq_quality", 1],
  ["comparison_content", 1],
  ["category_clarity", 1],
];

const SEARCH_VISIBILITY_GROUP: ReadonlyArray<[keyof AiVisibilitySignals, number]> = [
  ["website_clarity", 1],
  ["citations", 1],
  ["linkedin", 1],
  ["freshness", 1],
  ["gbp", 1],
];

const REPUTATION_GROUP: ReadonlyArray<[keyof AiVisibilitySignals, number]> = [
  ["reviews", 1],
  ["press", 1],
  ["social_proof", 1],
  ["authority_content", 1],
];

/** Signals that establish the business as a consistent, machine-readable entity. */
const ENTITY_SIGNALS: ReadonlyArray<keyof AiVisibilitySignals> = [
  "entity_consistency",
  "name_consistency",
  "category_clarity",
  "schema_markup",
  "contact_clarity",
];

/** Signals that establish authority / expertise. */
const AUTHORITY_SIGNALS: ReadonlyArray<keyof AiVisibilitySignals> = [
  "authority_content",
  "comparison_content",
  "faq_quality",
  "freshness",
];

/** Signals that establish third-party proof. */
const PROOF_SIGNALS: ReadonlyArray<keyof AiVisibilitySignals> = [
  "reviews",
  "press",
  "social_proof",
  "citations",
  "gbp",
  "linkedin",
];

export class MarketIntelEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    voc: new Map(),
    gaps: new Map(),
    visibility: new Map(),
  };

  constructor(options: MarketIntelEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Job 1: Voice-of-Customer intelligence (append-only) ----------------

  recordVoc(tenantId: string, input: RecordVocInput): VoiceOfCustomerInsight {
    const parsed = RecordVocInputSchema.parse(input);
    const improves = parsed.improves ?? deriveImproves(parsed);
    const insight = VoiceOfCustomerInsightSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      source: parsed.source,
      pain_points: parsed.pain_points,
      customer_language: parsed.customer_language,
      objections: parsed.objections,
      desires: parsed.desires,
      trust_barriers: parsed.trust_barriers,
      feature_requests: parsed.feature_requests,
      pricing_friction: parsed.pricing_friction,
      emotional_triggers: parsed.emotional_triggers,
      competitor_complaints: parsed.competitor_complaints,
      improves,
      created_at: this.clock().toISOString(),
    });
    this.s.voc.set(insight.id, insight);
    return insight;
  }

  listVoc(tenantId: string, businessKey?: string): VoiceOfCustomerInsight[] {
    return [...this.s.voc.values()].filter(
      (v) => v.tenant_id === tenantId && (businessKey === undefined || v.business_key === businessKey),
    );
  }

  // --- Job 2: Market Gap detection (append-only) --------------------------

  detectMarketGap(tenantId: string, input: DetectMarketGapInput): MarketGap {
    const parsed = DetectMarketGapInputSchema.parse(input);
    const gap = MarketGapSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      market: parsed.market,
      gap: parsed.gap,
      why_exists: parsed.why_exists,
      who_feels_it: parsed.who_feels_it,
      opportunity: parsed.opportunity,
      mvp_solution: parsed.mvp_solution,
      revenue_model: parsed.revenue_model,
      speed_to_market_plan: parsed.speed_to_market_plan,
      created_at: this.clock().toISOString(),
    });
    this.s.gaps.set(gap.id, gap);
    return gap;
  }

  listGaps(tenantId: string): MarketGap[] {
    return [...this.s.gaps.values()].filter((g) => g.tenant_id === tenantId);
  }

  // --- Job 3: AI-Search / reputation visibility scoring (AEO) -------------

  scoreAiVisibility(tenantId: string, input: ScoreAiVisibilityInput): AiVisibilityScore {
    const parsed = ScoreAiVisibilityInputSchema.parse(input);
    const sig = parsed.signals;

    const ai_visibility_score = weightedScore(sig, AI_VISIBILITY_GROUP);
    const search_visibility_score = weightedScore(sig, SEARCH_VISIBILITY_GROUP);
    const reputation_score = weightedScore(sig, REPUTATION_GROUP);

    const missing_entity_signals = weakSignals(sig, ENTITY_SIGNALS);
    const missing_authority_signals = weakSignals(sig, AUTHORITY_SIGNALS);
    const missing_proof = weakSignals(sig, PROOF_SIGNALS);

    const score = AiVisibilityScoreSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      signals: sig,
      ai_visibility_score,
      search_visibility_score,
      reputation_score,
      missing_entity_signals,
      missing_authority_signals,
      missing_proof,
      recommended_content: recommendContent(sig),
      recommended_citations: recommendCitations(sig),
      created_at: this.clock().toISOString(),
    });
    this.s.visibility.set(score.id, score);
    return score;
  }

  listVisibilityScores(tenantId: string, businessKey?: string): AiVisibilityScore[] {
    return [...this.s.visibility.values()].filter(
      (v) => v.tenant_id === tenantId && (businessKey === undefined || v.business_key === businessKey),
    );
  }
}

// ===========================================================================
// Deterministic helpers (AI-assisted versions arrive in Phase 2 behind a flag)
// ===========================================================================

/** Weighted average of a signal group, rescaled to a 0–100 score. Empty group → 0. */
function weightedScore(
  sig: AiVisibilitySignals,
  group: ReadonlyArray<[keyof AiVisibilitySignals, number]>,
): number {
  let total = 0;
  let weight = 0;
  for (const [key, w] of group) {
    total += sig[key] * w;
    weight += w;
  }
  if (weight === 0) return 0;
  return round1((total / weight) * 100);
}

/** The names of the signals in `keys` that are at or below the weak threshold. */
function weakSignals(
  sig: AiVisibilitySignals,
  keys: ReadonlyArray<keyof AiVisibilitySignals>,
): string[] {
  return keys.filter((k) => sig[k] < WEAK_SIGNAL_THRESHOLD).map((k) => String(k));
}

function recommendContent(sig: AiVisibilitySignals): string[] {
  const out: string[] = [];
  if (sig.faq_quality < WEAK_SIGNAL_THRESHOLD) out.push("Publish a thorough FAQ that answers buyer questions directly.");
  if (sig.comparison_content < WEAK_SIGNAL_THRESHOLD) out.push("Create comparison / alternatives pages vs named competitors.");
  if (sig.authority_content < WEAK_SIGNAL_THRESHOLD) out.push("Publish authority content (guides, original data) under a clear author.");
  if (sig.schema_markup < WEAK_SIGNAL_THRESHOLD) out.push("Add structured-data (schema.org) markup for Organization, FAQ, and Product.");
  if (sig.category_clarity < WEAK_SIGNAL_THRESHOLD) out.push("State the category and who it's for in plain language above the fold.");
  if (sig.freshness < WEAK_SIGNAL_THRESHOLD) out.push("Refresh stale pages so AI engines see recent, dated content.");
  return out;
}

function recommendCitations(sig: AiVisibilitySignals): string[] {
  const out: string[] = [];
  if (sig.citations < WEAK_SIGNAL_THRESHOLD) out.push("Earn citations from credible third-party sites and directories.");
  if (sig.press < WEAK_SIGNAL_THRESHOLD) out.push("Secure press mentions and link to them from the site.");
  if (sig.reviews < WEAK_SIGNAL_THRESHOLD) out.push("Grow verified reviews on the platforms AI engines read.");
  if (sig.gbp < WEAK_SIGNAL_THRESHOLD) out.push("Complete and verify the Google Business Profile.");
  if (sig.linkedin < WEAK_SIGNAL_THRESHOLD) out.push("Build out a consistent, active LinkedIn company entity.");
  if (sig.social_proof < WEAK_SIGNAL_THRESHOLD) out.push("Add named testimonials, logos, and case studies as social proof.");
  return out;
}

/**
 * Derive which assets a VoC insight should improve from the signals present. Deterministic;
 * mirrors the contract's `improves` vocabulary (copy/offers/onboarding/social/product/faqs/
 * follow-ups/sales-scripts).
 */
function deriveImproves(input: RecordVocInput): string[] {
  const out = new Set<string>();
  if (input.pain_points.length || input.customer_language.length) {
    out.add("copy");
    out.add("social");
  }
  if (input.objections.length || input.trust_barriers.length) {
    out.add("sales-scripts");
    out.add("faqs");
  }
  if (input.desires.length) out.add("offers");
  if (input.feature_requests.length) out.add("product");
  if (input.pricing_friction.length) out.add("offers");
  if (input.emotional_triggers.length) out.add("copy");
  if (input.competitor_complaints.length) out.add("copy");
  if (input.source === "lost_deal" || input.source === "sales_call") out.add("follow-ups");
  if (input.source === "support_ticket") out.add("onboarding");
  return [...out];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
