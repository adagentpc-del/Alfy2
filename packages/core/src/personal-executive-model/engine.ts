import {
  ObservePemInputSchema,
  PersonalExecutiveModelSchema,
  PemExplanationSchema,
  type ObservePemInput,
  type PersonalExecutiveModel,
  type PemExplanation,
  type PemDimension,
} from "@alfy2/shared";

const ALL_DIMENSIONS: PemDimension[] = [
  "decision_patterns", "communication_style", "opportunity_recognition", "risk_tolerance",
  "energy_patterns", "preferred_workflows", "approval_habits", "strategic_priorities",
  "recurring_bottlenecks", "values", "long_term_mission",
];

/**
 * Personal Executive Model (docs/adr/ADR-0128-personal-executive-model.md). One evolving model per tenant.
 * observe() appends a learned trait (with confidence + source); explain() produces the mandatory explanation
 * for a personalized recommendation — why Alyssa will likely prefer it, which observed patterns informed it,
 * how confident, and what evidence is missing. It amplifies, never imitates. Deterministic. Mutable store.
 */
export class PersonalExecutiveModelEngine {
  private readonly models = new Map<string, PersonalExecutiveModel>(); // keyed by tenantId
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  observe(tenantId: string, input: ObservePemInput): PersonalExecutiveModel {
    const i = ObservePemInputSchema.parse(input);
    const now = this.clock().toISOString();
    const existing = this.models.get(tenantId);
    const base = existing ?? {
      id: this.newId(),
      tenant_id: tenantId,
      traits: [],
      amplifies_not_imitates: true as const,
      created_at: now,
      updated_at: now,
    };
    const model = PersonalExecutiveModelSchema.parse({
      ...base,
      traits: [
        ...base.traits,
        { dimension: i.dimension, statement: i.statement, confidence: i.confidence, source: i.source, evidence_refs: i.evidence_refs },
      ],
      updated_at: now,
    });
    this.models.set(tenantId, model);
    return model;
  }

  /** Build the explanation for a recommendation, optionally focused on one dimension. */
  explain(tenantId: string, opts: { dimension?: PemDimension; recommendation?: string } = {}): PemExplanation {
    const model = this.models.get(tenantId);
    const traits = (model?.traits ?? []).filter((t) => (opts.dimension ? t.dimension === opts.dimension : true));
    const observedDims = new Set((model?.traits ?? []).map((t) => t.dimension));
    const confidence = traits.length ? round(traits.reduce((a, t) => a + t.confidence, 0) / traits.length) : 0;

    const top = traits[0];
    return PemExplanationSchema.parse({
      why_preferred: top
        ? `Aligns with observed pattern: ${top.statement}.`
        : "No observed patterns yet — this is a generic recommendation, not a personalized one.",
      informing_patterns: traits.map((t) => `${t.dimension}: ${t.statement}`),
      confidence,
      evidence_missing: ALL_DIMENSIONS.filter((d) => !observedDims.has(d)).map((d) => `No observations yet for ${d}.`),
    });
  }

  getModel(tenantId: string): PersonalExecutiveModel | undefined {
    return this.models.get(tenantId);
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
