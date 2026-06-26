import {
  ClassifyTaskInputSchema,
  DelegationDecisionSchema,
  type ClassifyTaskInput,
  type DelegationDecision,
  type TaskOwner,
} from "@alfy2/shared";

/**
 * The Executive Delegation System (docs/adr/ADR-0102-delegation.md). Identifies what Alyssa should NOT
 * do herself by classifying each task to an owner — keeping her on vision, relationships, high-value
 * sales, strategic decisions, creative insight, and approvals. Everything else routes to an AI agent,
 * automation, a contractor, a specialist, an attorney/CPA, an assistant, or gets deferred or deleted.
 * Founder hours are only returned when the task is offloaded (alyssa_only returns zero). Deterministic.
 * Tenant-scoped.
 */

export class ExecutiveDelegationSystem {
  private readonly decisions = new Map<string, DelegationDecision>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Classify a task to its rightful owner. */
  classify(tenantId: string, input: ClassifyTaskInput): DelegationDecision {
    const i = ClassifyTaskInputSchema.parse(input);

    const owner = this.owner(i);
    const hoursReturned = owner === "alyssa_only" ? 0 : i.founder_time_cost_hours;

    const decision = DelegationDecisionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      task: i.task,
      owner,
      reason: this.reason(i, owner),
      hours_returned: hoursReturned,
      created_at: this.clock().toISOString(),
    });
    this.decisions.set(decision.id, decision);
    return decision;
  }

  get(tenantId: string, id: string): DelegationDecision | undefined {
    const d = this.decisions.get(id);
    return d && d.tenant_id === tenantId ? d : undefined;
  }

  list(tenantId: string): DelegationDecision[] {
    return [...this.decisions.values()].filter((d) => d.tenant_id === tenantId);
  }

  /** Total founder hours returned across every classified task in the tenant. */
  hoursReturned(tenantId: string): number {
    return round(this.list(tenantId).reduce((s, d) => s + d.hours_returned, 0));
  }

  // --- internals ---

  /** Owner rules, evaluated in priority order. */
  private owner(i: ClassifyTaskInput): TaskOwner {
    if (i.needs_alyssa_judgment) return "alyssa_only";
    if (i.skill_requirement >= 0.8 && i.risk >= 0.6) return "attorney_cpa";
    if (i.skill_requirement >= 0.7) return "specialist";
    if (i.repeatability >= 0.7 && i.sop_available) return "automation";
    if (i.repeatability >= 0.5 && i.delegation_readiness >= 0.5) return "ai_agent";
    if (i.founder_time_cost_hours >= 1 && i.skill_requirement < 0.4) return "assistant";
    if (i.delegation_readiness >= 0.5) return "human_contractor";
    if (i.founder_time_cost_hours < 0.5 && !i.needs_alyssa_judgment) return "defer";
    return "delete";
  }

  private reason(i: ClassifyTaskInput, owner: TaskOwner): string {
    const ctx =
      `time ${i.founder_time_cost_hours}h, skill ${i.skill_requirement}, risk ${i.risk}, ` +
      `repeatability ${i.repeatability}, readiness ${i.delegation_readiness}, ` +
      `SOP ${i.sop_available ? "yes" : "no"}, needs Alyssa ${i.needs_alyssa_judgment ? "yes" : "no"}.`;
    const verdict: Record<TaskOwner, string> = {
      alyssa_only: "Genuinely needs Alyssa's vision/relationship/creativity/approval — keep it.",
      attorney_cpa: "High skill and high risk — route to an attorney or CPA.",
      specialist: "Specialized skill required — hand to a specialist.",
      automation: "Repeatable with an SOP — automate it.",
      ai_agent: "Repeatable and delegation-ready — give it to an AI agent.",
      assistant: "Low-skill time sink — give it to an assistant.",
      human_contractor: "Delegation-ready — hand to a human contractor.",
      defer: "Low value and low cost — defer it.",
      delete: "Not worth anyone's time — delete it.",
    };
    return `${verdict[owner]} (${ctx})`;
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
