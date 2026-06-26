import {
  KnowledgeSourceSchema,
  OperatorDigestItemSchema,
  AdaptationFilterResultSchema,
  KnowledgeTaxonomyEntrySchema,
  KnowledgeScenarioSchema,
  KnowledgeExperimentSchema,
  type KnowledgeSource,
  type KnowledgeSourceKind,
  type SourcePipelineStatus,
  type OperatorDigestItem,
  type AdaptationFilterResult,
  type KnowledgeTaxonomyEntry,
  type KnowledgeScenario,
  type ScenarioOption,
  type ScenarioKind,
  type KnowledgeExperiment,
  type KnowExperimentStatus,
  type KnowEffort,
  type KnowMagnitude,
  type CompanyStage,
  type KnowBusinessModel,
  type KnowDiscipline,
} from "@alfy2/shared";

/**
 * Knowledge Ops engine — turns public elite-expert knowledge into a structured,
 * tested, business-specific operating library (NOT a quote library).
 *
 * Sits on top of the ExpertCouncilEngine (lens application / conflict / advisory).
 * This engine adds: a source library + pipeline, the weekly Elite Operator Digest
 * (surface only likely-leverage — "do not overwhelm Alyssa"), the Alyssa Adaptation
 * Filter, knowledge governance (taxonomy + stage-fit + model-fit), a deterministic
 * six-lens scenario simulator, and an experiment + learning repository.
 *
 * Deterministic and infrastructure-free (in-memory reference store). Real persistence
 * + AI-assisted extraction arrive in Phase 2 behind the AI Gateway flag.
 */

export interface KnowledgeOpsEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export interface AddSourceInput {
  source_name: string;
  expert?: string;
  kind: KnowledgeSourceKind;
  url_ref?: string;
  date_added?: string;
}

export interface ListSourcesFilter {
  status?: SourcePipelineStatus;
  kind?: KnowledgeSourceKind;
  expert?: string;
}

export interface DigestItemInput {
  source?: string;
  principle: string;
  why_it_matters?: string;
  business_it_applies_to?: string;
  recommended_test?: string;
  effort?: KnowEffort;
  upside?: KnowMagnitude;
  risk?: KnowMagnitude;
}

export interface GenerateDigestInput {
  week: string;
  items: DigestItemInput[];
}

export interface AdaptationFilterInput {
  principle: string;
  business_key: string;
  fits_model?: boolean;
  fits_brand?: boolean;
  fits_energy?: boolean;
  protects_trust?: boolean;
  creates_leverage?: boolean;
  risks_generic?: boolean;
  too_manual?: boolean;
  ai_automatable?: boolean;
  cheaply_testable?: boolean;
}

export interface ClassifyInput {
  insight: string;
  discipline: KnowDiscipline;
  business_function?: string;
  funnel_stage?: string;
  company_stage: CompanyStage;
  business_model: KnowBusinessModel;
  audience_type?: string;
  risk_level?: KnowMagnitude;
  implementation_difficulty?: KnowEffort;
  expected_roi?: KnowMagnitude;
  confidence?: number;
  source_quality?: KnowMagnitude;
  freshness?: string;
}

export interface SimulateScenariosInput {
  strategy: string;
  business_key: string;
}

export interface DesignExperimentInput {
  hypothesis: string;
  business_key: string;
  audience?: string;
  asset?: string;
  channel?: string;
  timeline?: string;
  expected_result?: string;
  kpi?: string;
  success_threshold?: string;
  failure_threshold?: string;
  next_if_works?: string;
  next_if_fails?: string;
}

export interface RecordExperimentResultInput {
  status: KnowExperimentStatus;
  result_notes?: string;
}

interface Stores {
  sources: Map<string, KnowledgeSource>;
  digest: Map<string, OperatorDigestItem>;
  filters: Map<string, AdaptationFilterResult>;
  taxonomy: Map<string, KnowledgeTaxonomyEntry>;
  scenarios: Map<string, KnowledgeScenario>;
  experiments: Map<string, KnowledgeExperiment>;
}

const STAGE_ORDER: readonly CompanyStage[] = [
  "idea",
  "validation",
  "first_revenue",
  "repeatable_revenue",
  "scaling",
  "mature",
  "enterprise",
  "acquisition_ready",
];

const SCENARIO_KINDS: readonly ScenarioKind[] = [
  "fastest_cash",
  "highest_margin",
  "lowest_effort",
  "best_long_term_asset",
  "best_brand",
  "highest_automation",
];

export class KnowledgeOpsEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    sources: new Map(),
    digest: new Map(),
    filters: new Map(),
    taxonomy: new Map(),
    scenarios: new Map(),
    experiments: new Map(),
  };

  constructor(options: KnowledgeOpsEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Source library + pipeline ------------------------------------------

  addSource(tenantId: string, input: AddSourceInput): KnowledgeSource {
    const now = this.clock().toISOString();
    const source = KnowledgeSourceSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      source_name: input.source_name,
      expert: input.expert ?? "",
      kind: input.kind,
      url_ref: input.url_ref ?? "",
      date_added: input.date_added ?? now,
      summarized: false,
      principles_extracted: false,
      mapped_to_businesses: false,
      tested: false,
      status: "added",
      created_at: now,
      updated_at: null,
    });
    this.s.sources.set(source.id, source);
    return source;
  }

  /** Advance a source along the pipeline, flipping the matching boolean gates. */
  advanceSource(tenantId: string, id: string, status: SourcePipelineStatus): KnowledgeSource {
    const current = this.s.sources.get(id);
    if (!current || current.tenant_id !== tenantId) throw new Error("source not found");
    const next: KnowledgeSource = {
      ...current,
      status,
      summarized: current.summarized || statusReached(status, "summarized"),
      principles_extracted: current.principles_extracted || statusReached(status, "extracted"),
      mapped_to_businesses: current.mapped_to_businesses || statusReached(status, "mapped"),
      tested: current.tested || statusReached(status, "tested"),
      updated_at: this.clock().toISOString(),
    };
    this.s.sources.set(next.id, next);
    return next;
  }

  listSources(tenantId: string, filter: ListSourcesFilter = {}): KnowledgeSource[] {
    return [...this.s.sources.values()].filter(
      (src) =>
        src.tenant_id === tenantId &&
        (filter.status === undefined || src.status === filter.status) &&
        (filter.kind === undefined || src.kind === filter.kind) &&
        (filter.expert === undefined || src.expert === filter.expert),
    );
  }

  getSource(tenantId: string, id: string): KnowledgeSource | undefined {
    const src = this.s.sources.get(id);
    return src && src.tenant_id === tenantId ? src : undefined;
  }

  // --- Weekly Elite Operator Digest ---------------------------------------

  /**
   * Build the week's digest. ALL items are returned and stored, but `surfaced` is
   * true ONLY for likely-leverage items (upside high/medium AND effort not high AND
   * risk not high) — only surfaced items are recommended. Do not overwhelm Alyssa.
   */
  generateDigest(tenantId: string, input: GenerateDigestInput): OperatorDigestItem[] {
    const now = this.clock().toISOString();
    const out: OperatorDigestItem[] = [];
    for (const raw of input.items) {
      const effort = raw.effort ?? "medium";
      const upside = raw.upside ?? "medium";
      const risk = raw.risk ?? "medium";
      const surfaced = isLikelyLeverage(upside, effort, risk);
      const item = OperatorDigestItemSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        week: input.week,
        source: raw.source ?? "",
        principle: raw.principle,
        why_it_matters: raw.why_it_matters ?? "",
        business_it_applies_to: raw.business_it_applies_to ?? "",
        recommended_test: raw.recommended_test ?? "",
        effort,
        upside,
        risk,
        surfaced,
        created_at: now,
      });
      this.s.digest.set(item.id, item);
      out.push(item);
    }
    return out;
  }

  listDigest(tenantId: string, week?: string): OperatorDigestItem[] {
    return [...this.s.digest.values()].filter(
      (d) => d.tenant_id === tenantId && (week === undefined || d.week === week),
    );
  }

  // --- Alyssa Adaptation Filter -------------------------------------------

  /**
   * A principle PASSES only if it fits the model, brand and energy, protects trust,
   * creates leverage, is not generic, is not too manual, and is cheaply testable.
   */
  runAdaptationFilter(tenantId: string, input: AdaptationFilterInput): AdaptationFilterResult {
    const fits_model = input.fits_model ?? false;
    const fits_brand = input.fits_brand ?? false;
    const fits_energy = input.fits_energy ?? false;
    const protects_trust = input.protects_trust ?? false;
    const creates_leverage = input.creates_leverage ?? false;
    const risks_generic = input.risks_generic ?? false;
    const too_manual = input.too_manual ?? false;
    const ai_automatable = input.ai_automatable ?? false;
    const cheaply_testable = input.cheaply_testable ?? false;

    const passed =
      fits_model &&
      fits_brand &&
      fits_energy &&
      protects_trust &&
      creates_leverage &&
      !risks_generic &&
      !too_manual &&
      cheaply_testable;

    const recommendation = passed
      ? `Adapt and test "${input.principle}" for ${input.business_key}.`
      : `Do not adopt as-is: ${this.filterFailReasons({
          fits_model,
          fits_brand,
          fits_energy,
          protects_trust,
          creates_leverage,
          risks_generic,
          too_manual,
          cheaply_testable,
        }).join("; ")}.`;

    const result = AdaptationFilterResultSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      principle: input.principle,
      business_key: input.business_key,
      fits_model,
      fits_brand,
      fits_energy,
      protects_trust,
      creates_leverage,
      risks_generic,
      too_manual,
      ai_automatable,
      cheaply_testable,
      passed,
      recommendation,
      created_at: this.clock().toISOString(),
    });
    this.s.filters.set(result.id, result);
    return result;
  }

  listAdaptationFilters(tenantId: string, businessKey?: string): AdaptationFilterResult[] {
    return [...this.s.filters.values()].filter(
      (f) => f.tenant_id === tenantId && (businessKey === undefined || f.business_key === businessKey),
    );
  }

  // --- Knowledge governance: taxonomy + stage / model fit ------------------

  classify(tenantId: string, input: ClassifyInput): KnowledgeTaxonomyEntry {
    const entry = KnowledgeTaxonomyEntrySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      insight: input.insight,
      discipline: input.discipline,
      business_function: input.business_function ?? "",
      funnel_stage: input.funnel_stage ?? "",
      company_stage: input.company_stage,
      business_model: input.business_model,
      audience_type: input.audience_type ?? "",
      risk_level: input.risk_level ?? "medium",
      implementation_difficulty: input.implementation_difficulty ?? "medium",
      expected_roi: input.expected_roi ?? "medium",
      confidence: input.confidence ?? 0.5,
      source_quality: input.source_quality ?? "medium",
      freshness: input.freshness ?? "",
      created_at: this.clock().toISOString(),
    });
    this.s.taxonomy.set(entry.id, entry);
    return entry;
  }

  listTaxonomy(tenantId: string, discipline?: KnowDiscipline): KnowledgeTaxonomyEntry[] {
    return [...this.s.taxonomy.values()].filter(
      (t) => t.tenant_id === tenantId && (discipline === undefined || t.discipline === discipline),
    );
  }

  /**
   * Flag mismatches between the stage a piece of advice assumes and the stage the
   * business is actually at. Returns human-readable warnings ([] when fit is fine).
   */
  stageFitWarnings(insightStage: CompanyStage, businessStage: CompanyStage): string[] {
    const insightIdx = STAGE_ORDER.indexOf(insightStage);
    const businessIdx = STAGE_ORDER.indexOf(businessStage);
    const warnings: string[] = [];
    if (insightIdx < 0 || businessIdx < 0) return warnings;

    const gap = insightIdx - businessIdx;
    if (gap >= 2) {
      warnings.push(
        `Don't apply ${insightStage} advice to a ${businessStage} business — it is ${gap} stages ahead.`,
      );
      if (insightStage === "scaling" && businessStage === "first_revenue") {
        warnings.push("Don't apply scaling advice to a first_revenue business.");
      }
      if (insightStage === "enterprise") {
        warnings.push("Don't apply enterprise complexity to a platform that needs users.");
      }
    } else if (gap <= -2) {
      warnings.push(
        `${insightStage} advice may be too basic for a ${businessStage} business — it is ${-gap} stages behind.`,
      );
    }
    return warnings;
  }

  // --- Scenario simulator (deterministic, all six lenses) -----------------

  simulateScenarios(tenantId: string, input: SimulateScenariosInput): KnowledgeScenario {
    const scenarios: ScenarioOption[] = SCENARIO_KINDS.map((kind) =>
      scenarioFor(kind, input.strategy, input.business_key),
    );
    const scenario = KnowledgeScenarioSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      strategy: input.strategy,
      business_key: input.business_key,
      scenarios,
      created_at: this.clock().toISOString(),
    });
    this.s.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  listScenarios(tenantId: string, businessKey?: string): KnowledgeScenario[] {
    return [...this.s.scenarios.values()].filter(
      (sc) => sc.tenant_id === tenantId && (businessKey === undefined || sc.business_key === businessKey),
    );
  }

  // --- Experiment + learning repository -----------------------------------

  designExperiment(tenantId: string, input: DesignExperimentInput): KnowledgeExperiment {
    const now = this.clock().toISOString();
    const experiment = KnowledgeExperimentSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      hypothesis: input.hypothesis,
      business_key: input.business_key,
      audience: input.audience ?? "",
      asset: input.asset ?? "",
      channel: input.channel ?? "",
      timeline: input.timeline ?? "",
      expected_result: input.expected_result ?? "",
      kpi: input.kpi ?? "",
      success_threshold: input.success_threshold ?? "",
      failure_threshold: input.failure_threshold ?? "",
      next_if_works: input.next_if_works ?? "",
      next_if_fails: input.next_if_fails ?? "",
      status: "untested",
      result_notes: "",
      created_at: now,
      updated_at: null,
    });
    this.s.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /** The learning repository: record an outcome (keep / adapt / reject / archive). */
  recordExperimentResult(
    tenantId: string,
    id: string,
    input: RecordExperimentResultInput,
  ): KnowledgeExperiment {
    const current = this.s.experiments.get(id);
    if (!current || current.tenant_id !== tenantId) throw new Error("experiment not found");
    const next: KnowledgeExperiment = {
      ...current,
      status: input.status,
      result_notes: input.result_notes ?? current.result_notes,
      updated_at: this.clock().toISOString(),
    };
    this.s.experiments.set(next.id, next);
    return next;
  }

  listExperiments(tenantId: string, businessKey?: string): KnowledgeExperiment[] {
    return [...this.s.experiments.values()].filter(
      (e) => e.tenant_id === tenantId && (businessKey === undefined || e.business_key === businessKey),
    );
  }

  getExperiment(tenantId: string, id: string): KnowledgeExperiment | undefined {
    const e = this.s.experiments.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  // --- internals -----------------------------------------------------------

  private filterFailReasons(flags: {
    fits_model: boolean;
    fits_brand: boolean;
    fits_energy: boolean;
    protects_trust: boolean;
    creates_leverage: boolean;
    risks_generic: boolean;
    too_manual: boolean;
    cheaply_testable: boolean;
  }): string[] {
    const reasons: string[] = [];
    if (!flags.fits_model) reasons.push("does not fit the business model");
    if (!flags.fits_brand) reasons.push("does not fit the brand");
    if (!flags.fits_energy) reasons.push("does not fit Alyssa's energy");
    if (!flags.protects_trust) reasons.push("does not protect trust");
    if (!flags.creates_leverage) reasons.push("does not create leverage");
    if (flags.risks_generic) reasons.push("risks being generic");
    if (flags.too_manual) reasons.push("is too manual");
    if (!flags.cheaply_testable) reasons.push("is not cheaply testable");
    return reasons.length ? reasons : ["fails the adaptation filter"];
  }
}

// ===========================================================================
// Deterministic heuristics
// ===========================================================================

/** Likely-leverage = upside high/medium AND effort not high AND risk not high. */
function isLikelyLeverage(upside: KnowMagnitude, effort: KnowEffort, risk: KnowMagnitude): boolean {
  return (upside === "high" || upside === "medium") && effort !== "high" && risk !== "high";
}

const PIPELINE_ORDER: readonly SourcePipelineStatus[] = [
  "added",
  "summarized",
  "extracted",
  "mapped",
  "tested",
  "archived",
];

/** True if reaching `status` implies having passed (or being at) `gate`. */
function statusReached(status: SourcePipelineStatus, gate: SourcePipelineStatus): boolean {
  const statusIdx = PIPELINE_ORDER.indexOf(status);
  const gateIdx = PIPELINE_ORDER.indexOf(gate);
  // `archived` is terminal and does not retroactively claim every gate was met.
  if (status === "archived") return false;
  return statusIdx >= 0 && gateIdx >= 0 && statusIdx >= gateIdx;
}

function scenarioFor(kind: ScenarioKind, strategy: string, businessKey: string): ScenarioOption {
  const base = `${strategy} for ${businessKey}`;
  switch (kind) {
    case "fastest_cash":
      return {
        kind,
        upside: `Quickest revenue from ${base}`,
        effort: "medium",
        risk: "medium",
        timeline: "7-14 days",
        required_agents: ["revenue", "sales"],
        kpis: ["cash_collected", "time_to_first_dollar"],
        recommendation: "Run when the priority is immediate cash, accepting thinner margin.",
      };
    case "highest_margin":
      return {
        kind,
        upside: `Best unit economics from ${base}`,
        effort: "high",
        risk: "medium",
        timeline: "30-60 days",
        required_agents: ["pricing", "finance"],
        kpis: ["gross_margin", "revenue_per_unit"],
        recommendation: "Choose when protecting margin matters more than speed.",
      };
    case "lowest_effort":
      return {
        kind,
        upside: `Least operator load from ${base}`,
        effort: "low",
        risk: "low",
        timeline: "3-7 days",
        required_agents: ["operations"],
        kpis: ["hours_saved", "tasks_automated"],
        recommendation: "Choose when Alyssa's energy is the binding constraint.",
      };
    case "best_long_term_asset":
      return {
        kind,
        upside: `Most durable compounding asset from ${base}`,
        effort: "high",
        risk: "medium",
        timeline: "60-90 days",
        required_agents: ["product", "content"],
        kpis: ["asset_reuse_count", "compounding_score"],
        recommendation: "Choose when building reusable IP outweighs short-term cash.",
      };
    case "best_brand":
      return {
        kind,
        upside: `Strongest brand equity from ${base}`,
        effort: "medium",
        risk: "low",
        timeline: "30-45 days",
        required_agents: ["brand", "pr"],
        kpis: ["brand_lift", "audience_trust"],
        recommendation: "Choose when authority and trust are the strategic priority.",
      };
    case "highest_automation":
      return {
        kind,
        upside: `Most AI-leveraged version of ${base}`,
        effort: "medium",
        risk: "medium",
        timeline: "21-45 days",
        required_agents: ["automation", "ai"],
        kpis: ["automation_rate", "cost_per_unit"],
        recommendation: "Choose when the goal is to remove Alyssa from the loop entirely.",
      };
    default:
      return {
        kind,
        upside: base,
        effort: "medium",
        risk: "medium",
        timeline: "",
        required_agents: [],
        kpis: [],
        recommendation: "",
      };
  }
}
