import {
  ExpertFrameworkSchema,
  LensApplicationSchema,
  PrincipleConversionSchema,
  AdvisoryBoardReviewSchema,
  type ExpertFramework,
  type ExpertLensKind,
  type FrameworkTestStatus,
  type LensApplication,
  type LensRecommendation,
  type PrincipleConversion,
  type AdvisoryBoardReview,
  type BoardLensView,
} from "@alfy2/shared";

/**
 * Expert Knowledge Council + Framework Library engine.
 *
 * A private advisory board of elite operators. Deterministic and infrastructure-free (in-memory
 * reference store; real persistence + AI-assisted reasoning arrive in a later phase behind the AI
 * Gateway flag). It maintains a framework library and APPLIES it:
 *   select lenses → apply each → resolve conflicts → convert principle to execution → test.
 *
 * CORE RULE enforced in code: this engine never imitates a personality. It works with extracted,
 * de-personalized PRINCIPLES, evaluates fit, simulates, adapts to Alyssa's businesses, then asks for
 * execution + measurement. Money / investment recommendations always set `approval_needed = true`.
 *
 * {@link seedExpertLibrary} provisions a starter library ({@link DEFAULT_FRAMEWORKS}).
 */

export interface ExpertCouncilEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export interface AddFrameworkInput {
  expert: string;
  discipline: ExpertLensKind;
  source?: string;
  principle: string;
  framework_name: string;
  best_use_case?: string;
  bad_use_case?: string;
  misuse_risk?: string;
  adapted_for_alyssa?: string;
  business_applications?: string[];
  implementation_steps?: string[];
  kpi?: string;
  confidence?: number;
  test_status?: FrameworkTestStatus;
}

export interface ApplyLensesInput {
  objective: string;
  business_key: string;
  /** Optional explicit lenses; when omitted the engine selects them heuristically. */
  lenses?: ExpertLensKind[];
}

export interface ConvertPrincipleInput {
  principle: string;
  business_key?: string;
}

export interface RunAdvisoryBoardInput {
  decision: string;
  business_key?: string;
}

export interface WhatWouldTheGreatsDoInput {
  objective: string;
  business_key: string;
}

export interface ListFrameworksFilter {
  discipline?: ExpertLensKind;
  test_status?: FrameworkTestStatus;
  business_key?: string;
}

interface Stores {
  frameworks: Map<string, ExpertFramework>;
  applications: Map<string, LensApplication>;
  conversions: Map<string, PrincipleConversion>;
  reviews: Map<string, AdvisoryBoardReview>;
}

export class ExpertCouncilEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    frameworks: new Map(),
    applications: new Map(),
    conversions: new Map(),
    reviews: new Map(),
  };

  constructor(options: ExpertCouncilEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Frameworks ----------------------------------------------------------

  addFramework(tenantId: string, input: AddFrameworkInput): ExpertFramework {
    const now = this.clock().toISOString();
    const fw = ExpertFrameworkSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      expert: input.expert,
      discipline: input.discipline,
      source: input.source ?? "",
      principle: input.principle,
      framework_name: input.framework_name,
      best_use_case: input.best_use_case ?? "",
      bad_use_case: input.bad_use_case ?? "",
      misuse_risk: input.misuse_risk ?? "",
      adapted_for_alyssa: input.adapted_for_alyssa ?? "",
      business_applications: input.business_applications ?? [],
      implementation_steps: input.implementation_steps ?? [],
      kpi: input.kpi ?? "",
      confidence: input.confidence ?? 0.5,
      test_status: input.test_status ?? "untested",
      created_at: now,
      updated_at: null,
    });
    this.s.frameworks.set(fw.id, fw);
    return fw;
  }

  /**
   * Seed a starter library of de-personalized frameworks. Returns the created frameworks. Idempotent
   * per (tenant, framework_name): a framework that already exists for the tenant is skipped.
   */
  seedExpertLibrary(tenantId: string): ExpertFramework[] {
    const existing = new Set(this.listFrameworks(tenantId).map((f) => f.framework_name));
    const out: ExpertFramework[] = [];
    for (const spec of DEFAULT_FRAMEWORKS) {
      if (existing.has(spec.framework_name)) continue;
      out.push(this.addFramework(tenantId, spec));
    }
    return out;
  }

  listFrameworks(tenantId: string, filter?: ListFrameworksFilter): ExpertFramework[] {
    return [...this.s.frameworks.values()].filter((f) => {
      if (f.tenant_id !== tenantId) return false;
      if (filter?.discipline && f.discipline !== filter.discipline) return false;
      if (filter?.test_status && f.test_status !== filter.test_status) return false;
      if (filter?.business_key && !f.business_applications.includes(filter.business_key)) return false;
      return true;
    });
  }

  getFramework(tenantId: string, frameworkId: string): ExpertFramework | undefined {
    const f = this.s.frameworks.get(frameworkId);
    return f && f.tenant_id === tenantId ? f : undefined;
  }

  setTestStatus(tenantId: string, frameworkId: string, status: FrameworkTestStatus): ExpertFramework {
    const f = this.s.frameworks.get(frameworkId);
    if (!f || f.tenant_id !== tenantId) throw new Error("framework not found");
    const next: ExpertFramework = { ...f, test_status: status, updated_at: this.clock().toISOString() };
    this.s.frameworks.set(next.id, next);
    return next;
  }

  // --- Lens selection ------------------------------------------------------

  /**
   * Heuristic 2–5 lens selection by keyword. Deterministic and order-stable. `taskType` is an
   * optional hint that can nudge selection (e.g. "campaign", "deal", "hire").
   */
  selectLenses(objective: string, taskType?: string): ExpertLensKind[] {
    const t = `${objective} ${taskType ?? ""}`.toLowerCase();
    const has = (...words: string[]): boolean => words.some((w) => t.includes(w));
    const selected: ExpertLensKind[] = [];
    const add = (lens: ExpertLensKind): void => {
      if (!selected.includes(lens)) selected.push(lens);
    };

    if (has("offer", "price", "pricing", "package", "bundle", "guarantee", "value equation")) add("offer_pricing");
    if (has("social", "content", "brand", "attention", "audience", "post", "campaign", "viral", "reach", "awareness"))
      add("marketing_attention");
    if (has("close", "objection", "pitch", "sell", "persuad", "urgency", "convert")) add("sales_persuasion");
    if (has("negotiat", "deal", "terms", "counter", "concession", "acquire", "acquisition")) add("negotiation_deals");
    if (has("hire", "sop", "scale", "team", "delegate", "accountab", "operations", "process", "systemi")) add("operations_scaling");
    if (has("cash", "invest", "capital", "wealth", "money", "fund", "asset", "leverage", "roi", "margin")) add("wealth_investing");
    if (has("activation", "retention", "funnel", "onboard", "churn", "position", "growth", "product")) add("product_growth");
    if (has("psychology", "behavior", "persuasion", "influence", "trust", "bias", "habit")) add("psychology_behavior");
    if (has("leader", "culture", "manage", "vision", "morale")) add("leadership_culture");
    if (has("donor", "grant", "fundrais", "nonprofit", "philanthrop", "major gift", "sponsor")) add("nonprofit_fundraising");

    // Always ensure a sensible default core so we never return < 2 lenses.
    if (selected.length === 0) {
      add("marketing_attention");
      add("offer_pricing");
    } else if (selected.length === 1) {
      // Add a complementary second lens deterministically.
      const first = selected[0]!;
      add(first === "marketing_attention" ? "sales_persuasion" : "marketing_attention");
    }

    return selected.slice(0, 5);
  }

  // --- Apply lenses --------------------------------------------------------

  /**
   * Apply each selected lens to the objective: one deterministic, lens-specific recommendation per
   * lens. Detects conflicts between lenses, resolves them into a chosen strategy, and sets
   * `approval_needed` when money is involved (wealth_investing / offer_pricing).
   */
  applyLenses(tenantId: string, input: ApplyLensesInput): LensApplication {
    const lenses = input.lenses && input.lenses.length > 0
      ? dedupeLenses(input.lenses)
      : this.selectLenses(input.objective);
    const recommendations: LensRecommendation[] = lenses.map((lens) => ({
      lens,
      recommendation: lensRecommendation(lens, input.objective, input.business_key),
    }));
    const conflicts = detectConflicts(lenses);
    const chosen = resolveStrategy(lenses, input.objective);
    const approvalNeeded = lenses.includes("wealth_investing") || lenses.includes("offer_pricing");

    const app = LensApplicationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      objective: input.objective,
      business_key: input.business_key,
      selected_lenses: lenses,
      recommendations,
      conflicts,
      chosen_strategy: chosen.strategy,
      execution_steps: chosen.steps,
      kpis: lenses.map((l) => lensKpi(l)),
      approval_needed: approvalNeeded,
      created_at: this.clock().toISOString(),
    });
    this.s.applications.set(app.id, app);
    return app;
  }

  listApplications(tenantId: string): LensApplication[] {
    return [...this.s.applications.values()].filter((a) => a.tenant_id === tenantId);
  }

  // --- Convert principle to execution --------------------------------------

  convertPrinciple(tenantId: string, input: ConvertPrincipleInput): PrincipleConversion {
    const principle = input.principle;
    const businesses = input.business_key ? [input.business_key] : ["move_mi", "black_flag", "founderos"];
    const conv = PrincipleConversionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      principle,
      businesses,
      departments: principleDepartments(principle),
      agents: principleAgents(principle),
      templates_needed: principleTemplates(principle),
      sops_needed: principleSops(principle),
      campaign_use: principleCampaignUse(principle),
      product_use: principleProductUse(principle),
      kpi: principleKpi(principle),
      recommended_test: `A/B test the adapted principle on ${businesses[0]} for one cycle, then compare against the control KPI.`,
      created_at: this.clock().toISOString(),
    });
    this.s.conversions.set(conv.id, conv);
    return conv;
  }

  listConversions(tenantId: string): PrincipleConversion[] {
    return [...this.s.conversions.values()].filter((c) => c.tenant_id === tenantId);
  }

  // --- Advisory board ------------------------------------------------------

  /**
   * Run the full advisory board: Revenue / Brand / Operations / Financial / Product / Psychology /
   * Risk / AI lenses, each producing a recommendation, plus tradeoffs and the fastest safe next step.
   */
  runAdvisoryBoard(tenantId: string, input: RunAdvisoryBoardInput): AdvisoryBoardReview {
    const decision = input.decision;
    const biz = input.business_key ?? "the business";
    const lensesRun: BoardLensView[] = BOARD_LENSES.map((lens) => ({
      lens_name: lens.name,
      recommendation: lens.recommend(decision, biz),
    }));
    const tradeoffs = boardTradeoffs(decision);
    const moneyInvolved = /price|pricing|invest|capital|cash|fund|raise|budget|cost|fee|discount|deal/i.test(decision);

    const review = AdvisoryBoardReviewSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      decision,
      lenses_run: lensesRun,
      tradeoffs,
      decision_required: moneyInvolved
        ? "Money / pricing is involved — Alyssa approval required before execution."
        : "Confirm the chosen direction, then execute.",
      fastest_safe_next_step: `Run a small, reversible test of "${shorten(decision)}" on ${biz}, measure the lead KPI for one cycle, then decide to scale or roll back.`,
      created_at: this.clock().toISOString(),
    });
    this.s.reviews.set(review.id, review);
    return review;
  }

  listReviews(tenantId: string): AdvisoryBoardReview[] {
    return [...this.s.reviews.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- What would the greats do (adapted, NOT imitative) -------------------

  /**
   * Returns a LensApplication-style set of per-expert recommendations, each ADAPTED to Alyssa's
   * business — never an imitation of the personality. The recommendations carry the principle, not
   * the persona.
   */
  whatWouldTheGreatsDo(tenantId: string, input: WhatWouldTheGreatsDoInput): LensApplication {
    const lenses = this.selectLenses(input.objective);
    const frameworks = this.listFrameworks(tenantId);
    const recommendations: LensRecommendation[] = lenses.map((lens) => {
      const fw = frameworks.find((f) => f.discipline === lens);
      const base = fw
        ? `Principle from ${fw.expert}'s "${fw.framework_name}" (${fw.principle}), adapted — not imitated — for ${input.business_key}: ${fw.adapted_for_alyssa || lensRecommendation(lens, input.objective, input.business_key)}`
        : `Adapted ${lens.replace(/_/g, " ")} principle for ${input.business_key}: ${lensRecommendation(lens, input.objective, input.business_key)}`;
      return { lens, recommendation: base };
    });
    const chosen = resolveStrategy(lenses, input.objective);
    const approvalNeeded = lenses.includes("wealth_investing") || lenses.includes("offer_pricing");

    const app = LensApplicationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      objective: input.objective,
      business_key: input.business_key,
      selected_lenses: lenses,
      recommendations,
      conflicts: detectConflicts(lenses),
      chosen_strategy: `Adapt (do not imitate): ${chosen.strategy}`,
      execution_steps: chosen.steps,
      kpis: lenses.map((l) => lensKpi(l)),
      approval_needed: approvalNeeded,
      created_at: this.clock().toISOString(),
    });
    this.s.applications.set(app.id, app);
    return app;
  }
}

// ===========================================================================
// Deterministic lens reasoning (AI-assisted versions arrive in a later phase).
// ===========================================================================

function dedupeLenses(lenses: ExpertLensKind[]): ExpertLensKind[] {
  const out: ExpertLensKind[] = [];
  for (const l of lenses) if (!out.includes(l)) out.push(l);
  return out.slice(0, 5);
}

function lensRecommendation(lens: ExpertLensKind, objective: string, businessKey: string): string {
  const where = businessKey ? ` for ${businessKey}` : "";
  switch (lens) {
    case "offer_pricing":
      return `Make the offer${where} so valuable it feels stupid to say no: stack dream-outcome, perceived likelihood, speed, and ease; reduce risk with a guarantee. Objective: ${shorten(objective)}.`;
    case "marketing_attention":
      return `Win attention${where} by documenting the real work and giving value first; match each platform's native format and post volume over polish. Objective: ${shorten(objective)}.`;
    case "sales_persuasion":
      return `Sell${where} with direct response: one clear promise, proof, a reason to act now, and a single call to action. Objective: ${shorten(objective)}.`;
    case "operations_scaling":
      return `Scale${where} by turning the win into an SOP, assigning a clear owner, and measuring the loop before adding volume. Objective: ${shorten(objective)}.`;
    case "wealth_investing":
      return `Treat capital${where} as cash-flow leverage: prefer assets that pay, invert to avoid ruin, and protect the downside before chasing upside. Objective: ${shorten(objective)}.`;
    case "psychology_behavior":
      return `Use ethical influence${where}: reciprocity, commitment, social proof, authority, liking, scarcity — to lower friction, never to manipulate. Objective: ${shorten(objective)}.`;
    case "product_growth":
      return `Grow${where} by sharpening positioning, removing activation friction, and improving the retention loop before paid acquisition. Objective: ${shorten(objective)}.`;
    case "leadership_culture":
      return `Lead${where} by setting a clear standard, modeling accountability, and protecting focus over busywork. Objective: ${shorten(objective)}.`;
    case "negotiation_deals":
      return `Negotiate${where} by listening, labeling the other side's concerns, anchoring with calibrated questions, and trading — never just conceding. Objective: ${shorten(objective)}.`;
    case "nonprofit_fundraising":
      return `Fundraise${where} by leading with mission and impact, matching the ask to donor capacity, and stewarding relationships after the gift. Objective: ${shorten(objective)}.`;
    default:
      return `Apply the ${String(lens).replace(/_/g, " ")} lens${where}. Objective: ${shorten(objective)}.`;
  }
}

function lensKpi(lens: ExpertLensKind): string {
  switch (lens) {
    case "offer_pricing":
      return "offer take rate";
    case "marketing_attention":
      return "qualified reach / leads generated";
    case "sales_persuasion":
      return "conversion rate";
    case "operations_scaling":
      return "throughput per SOP / manual steps removed";
    case "wealth_investing":
      return "cash-flow / ROI";
    case "psychology_behavior":
      return "activation lift";
    case "product_growth":
      return "activation + retention rate";
    case "leadership_culture":
      return "team accountability score";
    case "negotiation_deals":
      return "value captured per deal";
    case "nonprofit_fundraising":
      return "dollars raised / donor retention";
    default:
      return "primary KPI";
  }
}

/**
 * Conflict detection between lenses. Lenses that pull in opposite directions are flagged so the
 * chosen strategy can resolve them explicitly.
 */
function detectConflicts(lenses: ExpertLensKind[]): string[] {
  const set = new Set(lenses);
  const conflicts: string[] = [];
  if (set.has("marketing_attention") && set.has("offer_pricing"))
    conflicts.push("Attention (give value free / reach) vs Offer (capture value / charge): balance free-value volume against monetized offers.");
  if (set.has("sales_persuasion") && set.has("psychology_behavior"))
    conflicts.push("Urgency / direct-response push vs trust-first influence: ensure persuasion never crosses into manipulation.");
  if (set.has("wealth_investing") && set.has("product_growth"))
    conflicts.push("Protect cash / downside vs invest in growth: stage spend behind validated retention.");
  if (set.has("operations_scaling") && set.has("marketing_attention"))
    conflicts.push("Speed of output vs system rigor: test fast first, systematize only what wins.");
  if (set.has("negotiation_deals") && set.has("nonprofit_fundraising"))
    conflicts.push("Hard-trade negotiation vs relationship-first stewardship: lead with mission, hold terms.");
  return conflicts;
}

/**
 * Resolve the selected lenses into one chosen strategy. Encodes the conflict-resolution priority:
 *   cash urgent → prioritize revenue; brand risk high → trust; platform early → speed/testing;
 *   legal risk → compliance; founder load high → simplicity.
 */
function resolveStrategy(lenses: ExpertLensKind[], objective: string): { strategy: string; steps: string[] } {
  const t = objective.toLowerCase();
  const cashUrgent = /cash|revenue|urgent|runway|broke|now|fast money|short on/.test(t);
  const brandRisk = /brand|reputation|trust|sensitive|public|backlash/.test(t);
  const platformEarly = /new platform|launch|early|first|untested|experiment|pilot/.test(t);
  const legalRisk = /legal|compliance|claim|regulat|hipaa|privacy/.test(t);
  const founderLoad = /overwhelm|too much|busy|burnout|capacity|simplify|founder load/.test(t);

  if (cashUrgent)
    return {
      strategy: "Cash is urgent → prioritize revenue: lead with the offer + direct-response sales, defer brand-building work.",
      steps: ["Sharpen the highest-leverage offer", "Run a direct-response push to the warmest audience", "Measure revenue this cycle before reinvesting"],
    };
  if (legalRisk)
    return {
      strategy: "Legal / compliance risk present → compliance first: gate the action behind review before any push.",
      steps: ["Route through compliance review", "Add required disclaimers / approvals", "Only then execute the marketing / sales motion"],
    };
  if (brandRisk)
    return {
      strategy: "Brand risk is high → trust first: lead with value and credibility, slow the hard sell.",
      steps: ["Lead with proof + value-first content", "Build credibility signals", "Introduce the offer once trust is established"],
    };
  if (platformEarly)
    return {
      strategy: "Platform is early / untested → speed + testing: ship small, learn fast, systematize only winners.",
      steps: ["Run cheap reversible tests", "Measure the lead KPI fast", "Systematize and scale only what wins"],
    };
  if (founderLoad)
    return {
      strategy: "Founder load is high → simplicity: pick the single highest-leverage move and turn it into an SOP.",
      steps: ["Pick one highest-leverage action", "Turn it into a repeatable SOP", "Delegate / automate the rest"],
    };
  // Default: balanced application of the primary lens.
  const primary = lenses[0] ?? "marketing_attention";
  return {
    strategy: `Apply the ${String(primary).replace(/_/g, " ")} lens as the lead move, supported by the remaining lenses.`,
    steps: ["Apply the lead lens to the objective", "Layer in supporting lenses", "Measure the primary KPI and iterate"],
  };
}

// --- Principle → execution mapping ----------------------------------------

function principleDepartments(principle: string): string[] {
  const p = principle.toLowerCase();
  const out = new Set<string>();
  if (/offer|price|pricing|guarantee|value/.test(p)) out.add("sales_revenue");
  if (/content|attention|brand|audience|market/.test(p)) out.add("growth_marketing");
  if (/sop|scale|process|operations/.test(p)) out.add("operations");
  if (/cash|invest|capital|margin|roi/.test(p)) out.add("finance");
  if (/activation|retention|product|funnel/.test(p)) out.add("product_platform");
  if (out.size === 0) {
    out.add("growth_marketing");
    out.add("sales_revenue");
  }
  return [...out];
}

function principleAgents(principle: string): string[] {
  const depts = principleDepartments(principle);
  const out: string[] = [];
  if (depts.includes("sales_revenue")) out.push("Pricing Agent", "Conversion Copywriter");
  if (depts.includes("growth_marketing")) out.push("Content Strategist", "Social Media Manager");
  if (depts.includes("operations")) out.push("SOP Builder");
  if (depts.includes("finance")) out.push("Pricing Analyst");
  if (depts.includes("product_platform")) out.push("Activation Agent");
  return out.length > 0 ? [...new Set(out)] : ["Content Strategist"];
}

function principleTemplates(principle: string): string[] {
  const p = principle.toLowerCase();
  const out: string[] = [];
  if (/offer|price|stupid saying no|guarantee|value/.test(p)) {
    out.push("Irresistible Offer Builder template", "Value-stack one-pager template", "Guarantee / risk-reversal template");
  }
  if (/content|attention|brand/.test(p)) out.push("Value-first content template", "Platform-native post template");
  if (/sales|close|persuad/.test(p)) out.push("Direct-response sales page template");
  return out.length > 0 ? out : ["Adapted-principle one-pager template"];
}

function principleSops(principle: string): string[] {
  const p = principle.toLowerCase();
  const out: string[] = [];
  if (/offer|price|value/.test(p)) out.push("SOP: build + test a new offer", "SOP: add a guarantee + measure take rate");
  if (/content|attention/.test(p)) out.push("SOP: document-don't-create content loop");
  if (/sales|close/.test(p)) out.push("SOP: direct-response launch checklist");
  return out.length > 0 ? out : ["SOP: adapt-test-measure a principle on one business"];
}

function principleCampaignUse(principle: string): string {
  return `Use the adapted principle as the core promise of the next campaign — lead with it in the hook and the offer. (${shorten(principle)})`;
}

function principleProductUse(principle: string): string {
  return `Bake the principle into the product's activation + offer surfaces so the value is obvious on first use. (${shorten(principle)})`;
}

function principleKpi(principle: string): string {
  const p = principle.toLowerCase();
  if (/offer|price|stupid saying no|guarantee/.test(p)) return "offer take rate / conversion rate";
  if (/content|attention|brand/.test(p)) return "qualified leads generated";
  if (/cash|invest|capital/.test(p)) return "cash-flow / ROI";
  return "conversion rate";
}

// --- Advisory board lenses -------------------------------------------------

interface BoardLensSpec {
  name: string;
  recommend: (decision: string, biz: string) => string;
}

const BOARD_LENSES: readonly BoardLensSpec[] = [
  { name: "Revenue", recommend: (d, b) => `Revenue lens on "${shorten(d)}"${b ? ` (${b})` : ""}: pick the path that most directly grows paid conversion this cycle; lead with the offer.` },
  { name: "Brand", recommend: (d, b) => `Brand lens on "${shorten(d)}": protect long-term trust — avoid moves that win a sale but erode credibility with ${b}'s audience.` },
  { name: "Operations", recommend: (d) => `Operations lens on "${shorten(d)}": only commit if it can be turned into a repeatable SOP without overloading the founder.` },
  { name: "Financial", recommend: (d) => `Financial lens on "${shorten(d)}": protect cash and margin first; stage spend behind a validated test, not a forecast.` },
  { name: "Product", recommend: (d, b) => `Product lens on "${shorten(d)}": ensure it improves ${b}'s activation or retention, not just top-of-funnel vanity.` },
  { name: "Psychology", recommend: (d) => `Psychology lens on "${shorten(d)}": reduce friction with ethical influence (proof, reciprocity, scarcity) — never manipulation.` },
  { name: "Risk", recommend: (d) => `Risk lens on "${shorten(d)}": flag legal / compliance / reputational exposure; require approval if money or claims are involved.` },
  { name: "AI", recommend: (d) => `AI lens on "${shorten(d)}": identify what can be automated or templated so the win compounds without more founder time.` },
];

function boardTradeoffs(decision: string): string[] {
  return [
    `Speed vs durability: shipping "${shorten(decision)}" fast may skip the systemization that makes it last.`,
    "Revenue now vs brand later: an aggressive monetization move can cost long-term trust.",
    "Cash protection vs growth investment: under-investing protects margin but can cap upside.",
    "Founder leverage vs control: automating frees time but needs guardrails to stay on-brand.",
  ];
}

function shorten(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean;
}

// ===========================================================================
// Seed catalog — starter framework library (de-personalized principles).
// ===========================================================================

export const DEFAULT_FRAMEWORKS: readonly AddFrameworkInput[] = [
  {
    expert: "Alex Hormozi",
    discipline: "offer_pricing",
    source: "$100M Offers — the Value Equation",
    principle: "Perceived value = (dream outcome × perceived likelihood of achievement) ÷ (time delay × effort & sacrifice). Maximize the top, minimize the bottom.",
    framework_name: "Value Equation",
    best_use_case: "Designing or sharpening a paid offer so it feels too good to refuse.",
    bad_use_case: "Discounting a commodity with no real value lift.",
    misuse_risk: "Over-promising the dream outcome you cannot deliver.",
    adapted_for_alyssa: "For Move Mi, stack the dream outcome (effortless moving) with speed and risk-reversal instead of cutting price.",
    business_applications: ["move_mi", "founderos"],
    implementation_steps: ["List the dream outcome", "Raise perceived likelihood with proof", "Cut time delay and effort", "Add a guarantee"],
    kpi: "offer take rate",
    confidence: 0.85,
    test_status: "untested",
  },
  {
    expert: "Alex Hormozi",
    discipline: "marketing_attention",
    source: "$100M Leads — core four lead generation",
    principle: "Reliable lead flow comes from doing more of the proven outreach channels (warm + cold, content + paid) at higher volume and quality, not from one clever tactic.",
    framework_name: "Lead-Gen Core Four",
    best_use_case: "Building predictable lead flow across multiple channels.",
    bad_use_case: "Chasing a single viral moment as a strategy.",
    misuse_risk: "Scaling spend before the offer converts.",
    adapted_for_alyssa: "For Move Mi, run consistent warm outreach + content volume to local movers before paying for ads.",
    business_applications: ["move_mi"],
    implementation_steps: ["Pick channels", "Set a volume floor", "Measure cost per qualified lead", "Scale what converts"],
    kpi: "cost per qualified lead",
    confidence: 0.8,
    test_status: "untested",
  },
  {
    expert: "Leila Hormozi",
    discipline: "operations_scaling",
    source: "Acquisition.com — leadership & accountability systems",
    principle: "What gets measured and owned gets done: every recurring outcome needs a single accountable owner and a visible scoreboard.",
    framework_name: "Ownership & Accountability Loop",
    best_use_case: "Scaling a team or process without the founder in the loop.",
    bad_use_case: "Adding accountability theater without real authority.",
    misuse_risk: "Blame culture instead of clear ownership.",
    adapted_for_alyssa: "Assign each Alfy² department a single owner KPI and a weekly scoreboard before adding headcount or volume.",
    business_applications: ["move_mi", "black_flag", "founderos"],
    implementation_steps: ["Name one owner per outcome", "Define the scoreboard", "Review weekly", "Coach, don't rescue"],
    kpi: "owned-outcome completion rate",
    confidence: 0.78,
    test_status: "untested",
  },
  {
    expert: "Gary Vaynerchuk",
    discipline: "marketing_attention",
    source: "Document, Don't Create",
    principle: "Capture attention by documenting the real work and journey rather than manufacturing polished content; volume and authenticity beat perfection.",
    framework_name: "Document Don't Create",
    best_use_case: "Building an organic audience with limited time.",
    bad_use_case: "Documenting with no point of view or value.",
    misuse_risk: "Oversharing noise that dilutes the brand.",
    adapted_for_alyssa: "Document the building of Move Mi and Alfy² as native short-form content instead of waiting for polished campaigns.",
    business_applications: ["move_mi", "founderos", "black_flag"],
    implementation_steps: ["Capture the work as it happens", "Cut to platform-native clips", "Post at volume", "Double down on what resonates"],
    kpi: "content engagement / follower-to-lead conversion",
    confidence: 0.72,
    test_status: "untested",
  },
  {
    expert: "Russell Brunson",
    discipline: "marketing_attention",
    source: "DotCom Secrets — the Value Ladder",
    principle: "Lead with a low-friction free or cheap offer, then ascend customers through increasing value and price as trust grows.",
    framework_name: "Value Ladder",
    best_use_case: "Designing a funnel that monetizes a cold audience over time.",
    bad_use_case: "Pushing the highest-ticket offer to a cold lead first.",
    misuse_risk: "Building rungs with no real value progression.",
    adapted_for_alyssa: "For founderos, open with a free assessment, ascend to a paid setup, then to ongoing operating support.",
    business_applications: ["founderos", "move_mi"],
    implementation_steps: ["Define each rung", "Create the front-end offer", "Map the ascension path", "Measure step-up rate"],
    kpi: "ascension / step-up rate",
    confidence: 0.75,
    test_status: "untested",
  },
  {
    expert: "Donald Miller",
    discipline: "marketing_attention",
    source: "Building a StoryBrand",
    principle: "Make the customer the hero and the brand the guide: clarify the customer's problem, position your offer as the plan, and call them to action.",
    framework_name: "Customer-as-Hero (StoryBrand)",
    best_use_case: "Clarifying confusing messaging on a site or page.",
    bad_use_case: "Making the brand the hero and burying the customer's problem.",
    misuse_risk: "Over-formulaic copy that sounds generic.",
    adapted_for_alyssa: "Rewrite Move Mi's site so the stressed mover is the hero and Move Mi is the calm guide with a clear plan.",
    business_applications: ["move_mi", "founderos"],
    implementation_steps: ["State the customer's problem", "Position the brand as guide", "Give a clear plan", "Add a direct CTA"],
    kpi: "landing page conversion",
    confidence: 0.74,
    test_status: "untested",
  },
  {
    expert: "Dan Kennedy",
    discipline: "sales_persuasion",
    source: "No B.S. Direct Marketing — direct response + urgency",
    principle: "Every message must demand a measurable response: a clear offer, a reason to act now, and a single call to action with real deadlines.",
    framework_name: "Direct-Response Urgency",
    best_use_case: "Driving immediate action from a warm audience.",
    bad_use_case: "Fake urgency that erodes trust when repeated.",
    misuse_risk: "Manufactured scarcity that customers see through.",
    adapted_for_alyssa: "Give Move Mi promotions a genuine deadline and one CTA, and track response rate per send.",
    business_applications: ["move_mi"],
    implementation_steps: ["State one offer", "Add a real deadline", "Use one CTA", "Track response rate"],
    kpi: "response / conversion rate",
    confidence: 0.7,
    test_status: "untested",
  },
  {
    expert: "Robert Cialdini",
    discipline: "psychology_behavior",
    source: "Influence — the six principles of persuasion",
    principle: "Behavior is reliably shaped by reciprocity, commitment & consistency, social proof, authority, liking, and scarcity — used ethically to reduce friction.",
    framework_name: "Six Principles of Influence",
    best_use_case: "Reducing friction in onboarding, sales, and retention.",
    bad_use_case: "Manipulating people against their interest.",
    misuse_risk: "Dark-pattern manipulation that backfires on trust.",
    adapted_for_alyssa: "Add genuine social proof and reciprocity (give value first) to Move Mi and founderos flows — never manufactured pressure.",
    business_applications: ["move_mi", "founderos", "black_flag"],
    implementation_steps: ["Add real social proof", "Give value first (reciprocity)", "Use small commitments", "Apply honest scarcity"],
    kpi: "activation lift",
    confidence: 0.76,
    test_status: "untested",
  },
  {
    expert: "April Dunford",
    discipline: "product_growth",
    source: "Obviously Awesome — positioning",
    principle: "Position the product in the context where its strengths are obviously the best choice — competitive alternative, unique attributes, value, and target segment.",
    framework_name: "Positioning Framework",
    best_use_case: "Clarifying what a product is and who it's best for.",
    bad_use_case: "Positioning against the wrong competitive alternative.",
    misuse_risk: "Positioning so narrow it kills the market, or so broad it means nothing.",
    adapted_for_alyssa: "Position founderos against the real alternative (hiring an ops team) and for the solo founder segment.",
    business_applications: ["founderos", "move_mi"],
    implementation_steps: ["Name the true alternative", "List unique attributes", "Map attributes to value", "Pick the best-fit segment"],
    kpi: "qualified-fit conversion",
    confidence: 0.73,
    test_status: "untested",
  },
  {
    expert: "Naval Ravikant",
    discipline: "wealth_investing",
    source: "How to Get Rich (without getting lucky) — leverage",
    principle: "Wealth compounds through permissionless leverage: code and media give near-zero-marginal-cost leverage that works while you sleep.",
    framework_name: "Leverage (Code & Media)",
    best_use_case: "Choosing where to invest founder time for compounding returns.",
    bad_use_case: "Trading time for money in linear, unleveraged work.",
    misuse_risk: "Chasing leverage on an unproven offer.",
    adapted_for_alyssa: "Invest Alfy² build time into reusable agents (code) and documented content (media) that serve every business.",
    business_applications: ["founderos", "move_mi", "black_flag"],
    implementation_steps: ["Identify linear work", "Replace it with code or media leverage", "Build once, reuse across businesses", "Measure time freed"],
    kpi: "founder time saved / leverage ratio",
    confidence: 0.8,
    test_status: "untested",
  },
  {
    expert: "Charlie Munger",
    discipline: "wealth_investing",
    source: "Poor Charlie's Almanack — inversion",
    principle: "Solve hard problems backward: instead of asking how to succeed, ask what would guarantee failure, then avoid it.",
    framework_name: "Inversion",
    best_use_case: "De-risking a big decision before committing.",
    bad_use_case: "Using inversion to justify never acting.",
    misuse_risk: "Analysis paralysis from over-inverting.",
    adapted_for_alyssa: "Before any Alfy² money decision, list what would guarantee it fails (cash, legal, trust) and design those out first.",
    business_applications: ["founderos", "move_mi", "black_flag"],
    implementation_steps: ["State the goal", "List failure modes", "Design out each failure mode", "Then pursue upside"],
    kpi: "avoided-loss / decision quality",
    confidence: 0.79,
    test_status: "untested",
  },
  {
    expert: "Warren Buffett",
    discipline: "wealth_investing",
    source: "Berkshire letters — economic moats",
    principle: "Durable advantage comes from moats — brand, switching costs, network effects, cost advantages — that protect returns from competition over time.",
    framework_name: "Economic Moats",
    best_use_case: "Choosing which business or feature to invest in for the long term.",
    bad_use_case: "Investing in a position with no defensible advantage.",
    misuse_risk: "Mistaking a temporary lead for a real moat.",
    adapted_for_alyssa: "Invest Alfy² effort where it builds a moat (proprietary data, reusable agent infrastructure), not easily-copied tactics.",
    business_applications: ["founderos", "black_flag"],
    implementation_steps: ["Identify the moat type", "Test its durability", "Invest behind the moat", "Re-check the moat each cycle"],
    kpi: "retained margin / defensibility",
    confidence: 0.77,
    test_status: "untested",
  },
  {
    expert: "Chris Voss",
    discipline: "negotiation_deals",
    source: "Never Split the Difference — tactical empathy",
    principle: "Win negotiations with tactical empathy: label the other side's emotions, use calibrated questions, and let them feel in control while you steer.",
    framework_name: "Tactical Empathy Negotiation",
    best_use_case: "High-stakes deals, vendor terms, and partnerships.",
    bad_use_case: "Using empathy as a manipulation script.",
    misuse_risk: "Sounding scripted and losing genuine rapport.",
    adapted_for_alyssa: "In Move Mi and founderos deals, label concerns and ask calibrated 'how' questions instead of conceding on price.",
    business_applications: ["move_mi", "founderos", "black_flag"],
    implementation_steps: ["Label their concern", "Ask a calibrated question", "Anchor with a range", "Trade, don't concede"],
    kpi: "value captured per deal",
    confidence: 0.75,
    test_status: "untested",
  },
  {
    expert: "Codie Sanchez",
    discipline: "wealth_investing",
    source: "Contrarian Thinking — boring cash-flow businesses",
    principle: "Build wealth by owning unsexy, cash-flowing assets rather than chasing hype; cash flow buys freedom and funds the next bet.",
    framework_name: "Cash-Flow Assets",
    best_use_case: "Choosing where to put capital for durable cash flow.",
    bad_use_case: "Buying hype assets with no cash flow.",
    misuse_risk: "Over-leveraging into an asset you can't operate.",
    adapted_for_alyssa: "Treat Move Mi as the boring cash-flow engine that funds higher-risk Alfy² and Black Flag bets.",
    business_applications: ["move_mi", "founderos"],
    implementation_steps: ["Find the cash-flow engine", "Stabilize its cash flow", "Reinvest into leverage", "Protect the downside"],
    kpi: "net cash-flow",
    confidence: 0.74,
    test_status: "untested",
  },
  {
    expert: "Major Gifts Fundraising Practice",
    discipline: "nonprofit_fundraising",
    source: "Donor cultivation cycle (identify → cultivate → ask → steward)",
    principle: "Major gifts come from relationships, not blasts: identify capable donors, cultivate trust, make a specific ask matched to capacity, then steward.",
    framework_name: "Major-Gifts Cultivation Cycle",
    best_use_case: "Raising larger gifts for a mission-driven org.",
    bad_use_case: "Mass-blasting a generic ask to cold donors.",
    misuse_risk: "Asking before the relationship is ready.",
    adapted_for_alyssa: "For Black Flag, cultivate a short list of capable donors and make a specific, mission-led ask matched to each donor's capacity.",
    business_applications: ["black_flag"],
    implementation_steps: ["Identify capable donors", "Cultivate the relationship", "Make a specific matched ask", "Steward after the gift"],
    kpi: "dollars raised / donor retention",
    confidence: 0.7,
    test_status: "untested",
  },
];
