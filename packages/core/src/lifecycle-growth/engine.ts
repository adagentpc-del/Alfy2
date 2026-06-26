import {
  LifecycleMapSchema,
  LifecycleStageSpecSchema,
  DesignLifecycleInputSchema,
  GrowthLoopSchema,
  DesignGrowthLoopInputSchema,
  GrowthLoopFilterSchema,
  TrustAssetAuditSchema,
  AuditTrustAssetsInputSchema,
  FirstImpressionAuditSchema,
  AuditFirstImpressionInputSchema,
  WhiteGloveJourneySchema,
  DesignWhiteGloveJourneyInputSchema,
  LIFECYCLE_STAGE_ORDER,
  type LifecycleMap,
  type LifecycleStageSpec,
  type DesignLifecycleInput,
  type GrowthLoop,
  type DesignGrowthLoopInput,
  type GrowthLoopFilter,
  type TrustAssetAudit,
  type AuditTrustAssetsInput,
  type FirstImpressionAudit,
  type AuditFirstImpressionInput,
  type WhiteGloveJourney,
  type DesignWhiteGloveJourneyInput,
} from "@alfy2/shared";

/**
 * Lifecycle + Growth Architecture engine.
 *
 * Designs the explicit 8-stage lifecycle per stakeholder, compounding growth loops, the trust
 * flywheel (trust-asset audits), first-impression audits (scored), and white-glove journeys.
 * Deterministic and infrastructure-free (in-memory reference store; real persistence arrives in
 * Phase 2). Complements — does not duplicate — the conversion + relationship-capital engines.
 */

export interface LifecycleGrowthEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class LifecycleGrowthEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LifecycleGrowthEngineError";
  }
}

interface Stores {
  lifecycleMaps: Map<string, LifecycleMap>;
  growthLoops: Map<string, GrowthLoop>;
  trustAudits: Map<string, TrustAssetAudit>;
  firstImpressionAudits: Map<string, FirstImpressionAudit>;
  whiteGloveJourneys: Map<string, WhiteGloveJourney>;
}

/** The eight first-impression boolean checks, in display order, with a remediation per check. */
const FIRST_IMPRESSION_CHECKS = [
  { key: "sets_expectations", recommendation: "set clearer expectations" },
  { key: "reduces_anxiety", recommendation: "reduce anxiety / address objections" },
  { key: "explains_value", recommendation: "explain the value more clearly" },
  { key: "attracts_right", recommendation: "sharpen messaging to attract the right audience" },
  { key: "repels_wrong", recommendation: "qualify out / repel the wrong audience" },
  { key: "credible", recommendation: "add credibility/proof" },
  { key: "creates_next_action", recommendation: "add a clear next action" },
  { key: "matches_brand", recommendation: "align with brand voice and visuals" },
] as const satisfies ReadonlyArray<{ key: keyof FirstImpressionChecks; recommendation: string }>;

type FirstImpressionChecks = {
  sets_expectations: boolean;
  reduces_anxiety: boolean;
  explains_value: boolean;
  attracts_right: boolean;
  repels_wrong: boolean;
  credible: boolean;
  creates_next_action: boolean;
  matches_brand: boolean;
};

export class LifecycleGrowthEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    lifecycleMaps: new Map(),
    growthLoops: new Map(),
    trustAudits: new Map(),
    firstImpressionAudits: new Map(),
    whiteGloveJourneys: new Map(),
  };

  constructor(options: LifecycleGrowthEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Lifecycle maps ------------------------------------------------------

  /**
   * Design (or scaffold) a stakeholder's full 8-stage lifecycle. When `stages` is omitted, all
   * eight stages are scaffolded (in order) with empty specs for the operator to fill in. When
   * provided, the stages are normalised into canonical lifecycle order.
   */
  designLifecycle(tenantId: string, input: DesignLifecycleInput): LifecycleMap {
    const parsed = DesignLifecycleInputSchema.parse(input);
    const provided = new Map(
      (parsed.stages ?? []).map((spec) => [spec.stage, spec] as const),
    );
    const stages: LifecycleStageSpec[] = LIFECYCLE_STAGE_ORDER.map((stage) =>
      provided.get(stage) ?? LifecycleStageSpecSchema.parse({ stage }),
    );
    const now = this.clock().toISOString();
    const map = LifecycleMapSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      stakeholder: parsed.stakeholder,
      stages,
      created_at: now,
      updated_at: null,
    });
    this.s.lifecycleMaps.set(map.id, map);
    return map;
  }

  getLifecycle(tenantId: string, id: string): LifecycleMap {
    const map = this.s.lifecycleMaps.get(id);
    if (!map || map.tenant_id !== tenantId) throw new LifecycleGrowthEngineError("lifecycle map not found");
    return map;
  }

  listLifecycles(tenantId: string, businessKey?: string): LifecycleMap[] {
    return [...this.s.lifecycleMaps.values()].filter(
      (m) => m.tenant_id === tenantId && (businessKey === undefined || m.business_key === businessKey),
    );
  }

  // --- Growth loops --------------------------------------------------------

  designGrowthLoop(tenantId: string, input: DesignGrowthLoopInput): GrowthLoop {
    const parsed = DesignGrowthLoopInputSchema.parse(input);
    const now = this.clock().toISOString();
    const loop = GrowthLoopSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      name: parsed.name,
      kind: parsed.kind,
      steps: parsed.steps,
      improvement_plan: parsed.improvement_plan,
      created_at: now,
      updated_at: null,
    });
    this.s.growthLoops.set(loop.id, loop);
    return loop;
  }

  listGrowthLoops(tenantId: string, filter?: GrowthLoopFilter): GrowthLoop[] {
    const f = filter ? GrowthLoopFilterSchema.parse(filter) : undefined;
    return [...this.s.growthLoops.values()].filter(
      (l) =>
        l.tenant_id === tenantId &&
        (f?.business_key === undefined || l.business_key === f.business_key) &&
        (f?.kind === undefined || l.kind === f.kind),
    );
  }

  getGrowthLoop(tenantId: string, id: string): GrowthLoop {
    const loop = this.s.growthLoops.get(id);
    if (!loop || loop.tenant_id !== tenantId) throw new LifecycleGrowthEngineError("growth loop not found");
    return loop;
  }

  // --- Trust asset audits (append-only) ------------------------------------

  auditTrustAssets(tenantId: string, input: AuditTrustAssetsInput): TrustAssetAudit {
    const parsed = AuditTrustAssetsInputSchema.parse(input);
    const audit = TrustAssetAuditSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      existing_assets: parsed.existing_assets,
      missing_assets: parsed.missing_assets,
      easiest_to_create: parsed.easiest_to_create,
      highest_value_proof: parsed.highest_value_proof,
      trust_blockers: parsed.trust_blockers,
      reputation_risks: parsed.reputation_risks,
      next_action: parsed.next_action,
      created_at: this.clock().toISOString(),
    });
    this.s.trustAudits.set(audit.id, audit);
    return audit;
  }

  listTrustAssetAudits(tenantId: string, businessKey?: string): TrustAssetAudit[] {
    return [...this.s.trustAudits.values()].filter(
      (a) => a.tenant_id === tenantId && (businessKey === undefined || a.business_key === businessKey),
    );
  }

  // --- First impression audits (append-only, scored) -----------------------

  /**
   * Audit a first-impression touchpoint. The `score` is the fraction of the 8 boolean checks that
   * pass; `recommendations` lists a concrete fix for each failing check.
   */
  auditFirstImpression(tenantId: string, input: AuditFirstImpressionInput): FirstImpressionAudit {
    const parsed = AuditFirstImpressionInputSchema.parse(input);
    let passed = 0;
    const recommendations: string[] = [];
    for (const check of FIRST_IMPRESSION_CHECKS) {
      if (parsed[check.key]) passed += 1;
      else recommendations.push(check.recommendation);
    }
    const score = passed / FIRST_IMPRESSION_CHECKS.length;
    const audit = FirstImpressionAuditSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      touchpoint: parsed.touchpoint,
      sets_expectations: parsed.sets_expectations,
      reduces_anxiety: parsed.reduces_anxiety,
      explains_value: parsed.explains_value,
      attracts_right: parsed.attracts_right,
      repels_wrong: parsed.repels_wrong,
      credible: parsed.credible,
      creates_next_action: parsed.creates_next_action,
      matches_brand: parsed.matches_brand,
      score,
      recommendations,
      created_at: this.clock().toISOString(),
    });
    this.s.firstImpressionAudits.set(audit.id, audit);
    return audit;
  }

  listFirstImpressionAudits(tenantId: string, businessKey?: string): FirstImpressionAudit[] {
    return [...this.s.firstImpressionAudits.values()].filter(
      (a) => a.tenant_id === tenantId && (businessKey === undefined || a.business_key === businessKey),
    );
  }

  // --- White-glove journeys ------------------------------------------------

  designWhiteGloveJourney(tenantId: string, input: DesignWhiteGloveJourneyInput): WhiteGloveJourney {
    const parsed = DesignWhiteGloveJourneyInputSchema.parse(input);
    const now = this.clock().toISOString();
    const journey = WhiteGloveJourneySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      stakeholder: parsed.stakeholder,
      stages: parsed.stages,
      created_at: now,
      updated_at: null,
    });
    this.s.whiteGloveJourneys.set(journey.id, journey);
    return journey;
  }

  getWhiteGloveJourney(tenantId: string, id: string): WhiteGloveJourney {
    const journey = this.s.whiteGloveJourneys.get(id);
    if (!journey || journey.tenant_id !== tenantId) throw new LifecycleGrowthEngineError("white-glove journey not found");
    return journey;
  }

  listWhiteGloveJourneys(tenantId: string, businessKey?: string): WhiteGloveJourney[] {
    return [...this.s.whiteGloveJourneys.values()].filter(
      (j) => j.tenant_id === tenantId && (businessKey === undefined || j.business_key === businessKey),
    );
  }
}
