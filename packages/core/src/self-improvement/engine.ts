import {
  EvaluateSystemInputSchema,
  SelfImprovementReportSchema,
  type EvaluateSystemInput,
  type SelfImprovementReport,
  type SelfImprovementFinding,
  type SelfImprovementFindingKind,
  type SystemComponentInput,
} from "@alfy2/shared";

/**
 * Enterprise Self-Improvement Engine (docs/adr/ADR-0117-self-improvement.md). Each period it evaluates the
 * operating system itself: for every component it picks the single dominant problem — slow, duplicated,
 * fragile, confusing — or the right action — simplify, merge, retire, promote to infrastructure — and emits
 * at most one finding with a recommendation and a priority equal to the driving signal. From the findings it
 * assembles a refactoring plan and a tech-debt report, and a complexity delta where simplifications,
 * merges, and retirements reduce complexity. The goal: improve continuously without growing more
 * complicated. Deterministic, append-only. Tenant-scoped.
 */

interface CandidateFinding {
  kind: SelfImprovementFindingKind;
  recommendation: string;
  priority: number;
}

export class EnterpriseSelfImprovementEngine {
  private readonly reports = new Map<string, SelfImprovementReport>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Evaluate the system's components and produce a refactoring plan, tech-debt report, and complexity delta. */
  evaluate(tenantId: string, input: EvaluateSystemInput): SelfImprovementReport {
    const i = EvaluateSystemInputSchema.parse(input);

    const findings: SelfImprovementFinding[] = [];
    const techDebt: string[] = [];

    for (const c of i.components) {
      const candidate = dominantFinding(c);
      if (candidate) {
        findings.push({
          component: c.component,
          kind: candidate.kind,
          recommendation: candidate.recommendation,
          priority: round2(candidate.priority),
        });
      }
      if (c.fragility >= 0.5 || c.latency >= 0.5) techDebt.push(c.component);
    }

    // Refactoring plan = the recommendations of the highest-priority findings.
    const refactoringPlan = [...findings]
      .sort((a, b) => b.priority - a.priority)
      .map((f) => f.recommendation);

    // Simplifications reduce complexity; new work adds a little.
    const complexityDelta = findings.length
      ? clamp(
          round2(
            findings.reduce((sum, f) => sum + complexityContribution(f.kind), 0) / findings.length,
          ),
          -1,
          1,
        )
      : 0;

    const r = SelfImprovementReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      period_label: i.period_label,
      findings,
      refactoring_plan: refactoringPlan,
      tech_debt: techDebt,
      complexity_delta: complexityDelta,
      created_at: this.clock().toISOString(),
    });
    this.reports.set(r.id, r);
    return r;
  }

  get(tenantId: string, id: string): SelfImprovementReport | undefined {
    const r = this.reports.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): SelfImprovementReport[] {
    return [...this.reports.values()].filter((r) => r.tenant_id === tenantId);
  }
}

/** Pick at most one finding per component by the most severe signal. */
function dominantFinding(c: SystemComponentInput): CandidateFinding | null {
  const candidates: CandidateFinding[] = [];

  // Problem signals (and their recommended actions). Duplication recommends a merge; confusion a simplify.
  if (c.duplication >= 0.5) {
    candidates.push({
      kind: "duplicated",
      recommendation: `Merge "${c.component}" with its duplicate to remove the overlap.`,
      priority: c.duplication,
    });
  }
  if (c.fragility >= 0.5) {
    candidates.push({
      kind: "fragile",
      recommendation: `Harden "${c.component}" with validation, retries, and alerting.`,
      priority: c.fragility,
    });
  }
  if (c.latency >= 0.5) {
    candidates.push({
      kind: "slow",
      recommendation: `Optimize "${c.component}" to cut its latency.`,
      priority: c.latency,
    });
  }
  if (c.confusion >= 0.5) {
    candidates.push({
      kind: "confusing",
      recommendation: `Simplify "${c.component}" to make it easier to understand.`,
      priority: c.confusion,
    });
  }

  // Lifecycle actions: retire what is unused; promote what is reusable and well-used.
  if (c.usage < 0.2) {
    candidates.push({
      kind: "retire",
      recommendation: `Retire "${c.component}" — usage is too low to justify maintaining it.`,
      priority: 1 - c.usage,
    });
  }
  if (c.reuse_potential >= 0.6 && c.usage >= 0.5) {
    candidates.push({
      kind: "promote_to_infrastructure",
      recommendation: `Promote "${c.component}" to shared infrastructure for broad reuse.`,
      priority: c.reuse_potential,
    });
  }

  if (candidates.length === 0) return null;

  // Most severe signal wins; ties resolve deterministically by candidate order above.
  let best = candidates[0]!;
  for (const candidate of candidates) {
    if (candidate.priority > best.priority) best = candidate;
  }
  return best;
}

/** Simplifications/merges/retirements reduce complexity; promotions help slightly; everything else adds. */
function complexityContribution(kind: SelfImprovementFindingKind): number {
  switch (kind) {
    case "merge":
    case "simplify":
    case "retire":
    case "duplicated": // recommended action is a merge → simpler
    case "confusing": // recommended action is a simplify → simpler
      return -0.3;
    case "promote_to_infrastructure":
      return -0.1;
    default:
      return 0.1;
  }
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
