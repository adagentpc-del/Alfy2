import {
  BlindSpotSchema,
  RecursiveDiagnosisSchema,
  BillionDollarCheckSchema,
  type BlindSpot,
  type RecursiveDiagnosis,
  type BillionDollarCheck,
  type OversightCadence,
  type RecursiveLayer,
} from "@alfy2/shared";

/**
 * Oversight engine — three cross-cutting quality / visibility gates.
 *
 *   1. {@link detectBlindSpots} — Leadership Blind-Spot Detector: turns the standard "what can't
 *      Alyssa see?" questions into concrete blind-spot records, each with a reporting fix, an owner
 *      and a cadence.
 *   2. {@link runRecursiveDiagnosis} — Recursive System Optimizer: applies the same operating
 *      questions to any layer/subject (business, department, agent, campaign, each journey).
 *   3. {@link runBillionDollarCheck} — Billion-Dollar Standard Checker: a pre-ship gate. `passed`
 *      is true ONLY if all nine boolean criteria are true; otherwise `revisions_needed` lists the
 *      specific failures and the rule is enforced: revise before execution.
 *
 * Deterministic and infrastructure-free (in-memory reference store). All records are append-only.
 */

export interface OversightEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

/** A single standard blind-spot question + how it gets surfaced. */
export interface BlindSpotQuestion {
  /** The thing that may be invisible today. */
  blind_spot: string;
  /** Why it matters that it is invisible. */
  why_matters: string;
  /** What signal/data is needed to see it. */
  data_needed: string;
  /** The reporting change that closes the gap. */
  reporting_fix: string;
  /** Default cadence for the fix. */
  cadence: OversightCadence;
}

export interface DetectBlindSpotsInput {
  /** Department key or "business". */
  scope: string;
  /** Override the standard question set; defaults to {@link STANDARD_BLIND_SPOT_QUESTIONS}. */
  questions?: BlindSpotQuestion[];
  /** Who owns surfacing these going forward (defaults to "leadership"). */
  owner?: string;
}

export interface RunRecursiveDiagnosisInput {
  layer: RecursiveLayer;
  subject: string;
  stakeholder: string;
  objective: string;
  first_impression: string;
  trust_gap: string;
  conversion_action: string;
  support_loop: string;
  kpi: string;
  feedback_loop: string;
  retention_loop: string;
  root_failure_point: string;
}

export interface RunBillionDollarCheckInput {
  subject: string;
  investor_grade: boolean;
  client_grade: boolean;
  legal_grade: boolean;
  operator_grade: boolean;
  scales_100x: boolean;
  protects_brand: boolean;
  protects_revenue: boolean;
  protects_trust: boolean;
  reduces_future_chaos: boolean;
}

interface OversightStores {
  blindSpots: Map<string, BlindSpot>;
  diagnoses: Map<string, RecursiveDiagnosis>;
  checks: Map<string, BillionDollarCheck>;
}

/**
 * The standard "what can leadership not currently see?" questions. Each maps a hidden signal to a
 * concrete reporting fix. The detector instantiates these as records for a given scope.
 */
export const STANDARD_BLIND_SPOT_QUESTIONS: readonly BlindSpotQuestion[] = [
  {
    blind_spot: "Work is happening that is never reported.",
    why_matters: "Effort and cost accrue without visibility, so leadership cannot steer it.",
    data_needed: "Activity log of every agent/department action vs. what surfaces in reports.",
    reporting_fix: "Add an unreported-work line to the operating review: actions taken not yet on any report.",
    cadence: "weekly",
  },
  {
    blind_spot: "Key outcomes have no KPI attached.",
    why_matters: "What isn't measured can't be improved or defended to investors.",
    data_needed: "Map of stated objectives to the KPI that proves each one.",
    reporting_fix: "Flag every objective missing a KPI and require one before the next review.",
    cadence: "weekly",
  },
  {
    blind_spot: "Decisions are being delayed without anyone noticing.",
    why_matters: "Delayed decisions silently compound into missed revenue and stalled execution.",
    data_needed: "Age of every open decision and who it is waiting on.",
    reporting_fix: "Surface a decisions-aging report: decisions open > N days, owner, blocker.",
    cadence: "daily",
  },
  {
    blind_spot: "Failures are hidden inside aggregate success.",
    why_matters: "Hidden failures erode trust and brand long before the average metric moves.",
    data_needed: "Per-case outcomes, not just averages — every failed run / unhappy client.",
    reporting_fix: "Report worst-case outcomes alongside averages so failures surface early.",
    cadence: "weekly",
  },
  {
    blind_spot: "Cross-team dependencies are unclear.",
    why_matters: "Unclear dependencies cause silent blockers and last-minute fire drills.",
    data_needed: "Dependency graph of which team/agent waits on which input.",
    reporting_fix: "Publish a dependency map and flag any dependency with no named owner.",
    cadence: "weekly",
  },
  {
    blind_spot: "Some agents are overloaded while others are idle.",
    why_matters: "Overloaded agents degrade quality and become single points of failure.",
    data_needed: "Per-agent in-flight workload and queue depth.",
    reporting_fix: "Add an agent-load report; alert when any agent exceeds its safe capacity.",
    cadence: "daily",
  },
  {
    blind_spot: "Users / clients are stuck somewhere in the journey.",
    why_matters: "Stuck users churn and never tell you why; revenue leaks quietly.",
    data_needed: "Funnel/journey stage of every active user and time-in-stage.",
    reporting_fix: "Surface a stuck-users report: anyone past the expected time-in-stage.",
    cadence: "daily",
  },
  {
    blind_spot: "Money is being missed (unbilled, unconverted, unrenewed).",
    why_matters: "Missed money is the cheapest revenue there is and it is fully invisible today.",
    data_needed: "Unbilled work, abandoned carts, expiring contracts, unconverted leads.",
    reporting_fix: "Report a missed-money line each cycle with an owner to recover it.",
    cadence: "weekly",
  },
  {
    blind_spot: "Risks are accumulating but never surfaced.",
    why_matters: "Unsurfaced risk is how billion-dollar standards quietly fail in production.",
    data_needed: "Open risks, their likelihood/impact, and whether each has a mitigation.",
    reporting_fix: "Maintain a risk register on the review; escalate any risk with no mitigation.",
    cadence: "monthly",
  },
];

export class OversightEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: OversightStores = {
    blindSpots: new Map(),
    diagnoses: new Map(),
    checks: new Map(),
  };

  constructor(options: OversightEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- 1. Leadership Blind-Spot Detector ----------------------------------

  /**
   * Produce blind-spot records for a scope (department or "business") from the standard questions
   * (or a caller-supplied set). Each record carries a concrete reporting fix, an owner and a cadence.
   */
  detectBlindSpots(tenantId: string, input: DetectBlindSpotsInput): BlindSpot[] {
    const now = this.clock().toISOString();
    const owner = input.owner ?? "leadership";
    const questions = input.questions ?? STANDARD_BLIND_SPOT_QUESTIONS;
    const out: BlindSpot[] = [];
    for (const q of questions) {
      const record = BlindSpotSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        scope: input.scope,
        blind_spot: q.blind_spot,
        why_matters: q.why_matters,
        data_needed: q.data_needed,
        reporting_fix: q.reporting_fix,
        owner,
        cadence: q.cadence,
        created_at: now,
      });
      this.s.blindSpots.set(record.id, record);
      out.push(record);
    }
    return out;
  }

  listBlindSpots(tenantId: string, scope?: string): BlindSpot[] {
    return [...this.s.blindSpots.values()].filter(
      (b) => b.tenant_id === tenantId && (scope === undefined || b.scope === scope),
    );
  }

  getBlindSpot(tenantId: string, id: string): BlindSpot | undefined {
    const b = this.s.blindSpots.get(id);
    return b && b.tenant_id === tenantId ? b : undefined;
  }

  // --- 2. Recursive System Optimizer --------------------------------------

  /**
   * Apply the recursive operating questions to a single layer/subject and append the diagnosis.
   * The same questions recur at every layer (business → department → agent → campaign → journeys).
   */
  runRecursiveDiagnosis(tenantId: string, input: RunRecursiveDiagnosisInput): RecursiveDiagnosis {
    const record = RecursiveDiagnosisSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      layer: input.layer,
      subject: input.subject,
      stakeholder: input.stakeholder,
      objective: input.objective,
      first_impression: input.first_impression,
      trust_gap: input.trust_gap,
      conversion_action: input.conversion_action,
      support_loop: input.support_loop,
      kpi: input.kpi,
      feedback_loop: input.feedback_loop,
      retention_loop: input.retention_loop,
      root_failure_point: input.root_failure_point,
      created_at: this.clock().toISOString(),
    });
    this.s.diagnoses.set(record.id, record);
    return record;
  }

  listDiagnoses(tenantId: string, layer?: RecursiveLayer): RecursiveDiagnosis[] {
    return [...this.s.diagnoses.values()].filter(
      (d) => d.tenant_id === tenantId && (layer === undefined || d.layer === layer),
    );
  }

  getDiagnosis(tenantId: string, id: string): RecursiveDiagnosis | undefined {
    const d = this.s.diagnoses.get(id);
    return d && d.tenant_id === tenantId ? d : undefined;
  }

  // --- 3. Billion-Dollar Standard Checker ---------------------------------

  /**
   * Pre-ship quality gate. `passed` is true ONLY if all nine criteria are true. Otherwise the
   * specific failing checks are listed in `revisions_needed` — the rule is enforced: if it does
   * not pass, it is revised before execution.
   */
  runBillionDollarCheck(tenantId: string, input: RunBillionDollarCheckInput): BillionDollarCheck {
    const failures: Array<[boolean, string]> = [
      [input.investor_grade, "would not hold up to investor review"],
      [input.client_grade, "would not hold up to client review"],
      [input.legal_grade, "would not hold up to legal review"],
      [input.operator_grade, "would not hold up to operator review"],
      [input.scales_100x, "would not hold up at 100x scale"],
      [input.protects_brand, "does not protect the brand"],
      [input.protects_revenue, "does not protect margin/revenue"],
      [input.protects_trust, "does not protect trust"],
      [input.reduces_future_chaos, "would create future chaos"],
    ];
    const revisions = failures.filter(([ok]) => !ok).map(([, msg]) => msg);
    const passed = revisions.length === 0;
    const record = BillionDollarCheckSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      subject: input.subject,
      investor_grade: input.investor_grade,
      client_grade: input.client_grade,
      legal_grade: input.legal_grade,
      operator_grade: input.operator_grade,
      scales_100x: input.scales_100x,
      protects_brand: input.protects_brand,
      protects_revenue: input.protects_revenue,
      protects_trust: input.protects_trust,
      reduces_future_chaos: input.reduces_future_chaos,
      passed,
      // When not passed, prepend the enforced rule so it travels with the record.
      revisions_needed: passed ? [] : ["Revise before execution.", ...revisions],
      created_at: this.clock().toISOString(),
    });
    this.s.checks.set(record.id, record);
    return record;
  }

  listChecks(tenantId: string, onlyPassed?: boolean): BillionDollarCheck[] {
    return [...this.s.checks.values()].filter(
      (c) => c.tenant_id === tenantId && (onlyPassed === undefined || c.passed === onlyPassed),
    );
  }

  getCheck(tenantId: string, id: string): BillionDollarCheck | undefined {
    const c = this.s.checks.get(id);
    return c && c.tenant_id === tenantId ? c : undefined;
  }
}
