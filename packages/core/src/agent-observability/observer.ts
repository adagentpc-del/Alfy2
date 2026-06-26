import {
  LogAgentActionInputSchema,
  AgentActionRecordSchema,
  ActionExplanationSchema,
  type LogAgentActionInput,
  type AgentActionRecord,
  type AgentPerformance,
  type ObservabilityDashboard,
  type RepeatedFailure,
  type ApprovalBottleneck,
  type ActionExplanation,
} from "@alfy2/shared";

/**
 * Agent Observability (docs/adr/ADR-0020-agent-observability.md). Records every agent action with full
 * provenance — name, task, input, tools used, memory used, decision, approval status, cost, runtime,
 * outcome, errors, downstream effects — as an append-only log, and rolls it up into dashboards. It can
 * always answer: what did this agent do, why, what data did it use, and what changed afterward.
 * Deterministic. Tenant-scoped.
 */

export class AgentObservabilityError extends Error {}

const FAIL_OUTCOMES = new Set(["failure", "blocked"]);
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface AgentObservabilityOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class AgentObservability {
  private readonly records: AgentActionRecord[] = [];
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: AgentObservabilityOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Append one immutable action record. */
  record(tenantId: string, input: LogAgentActionInput): AgentActionRecord {
    const i = LogAgentActionInputSchema.parse(input);
    const rec = AgentActionRecordSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      ...i,
      at: this.clock().toISOString(),
    });
    this.records.push(rec);
    return rec;
  }

  get(tenantId: string, id: string): AgentActionRecord | undefined {
    return this.records.find((r) => r.id === id && r.tenant_id === tenantId);
  }

  /** Every action for a tenant (newest last), optionally filtered to one agent. */
  list(tenantId: string, agentName?: string): AgentActionRecord[] {
    return this.records.filter(
      (r) => r.tenant_id === tenantId && (agentName ? r.agent_name === agentName : true),
    );
  }

  /** "What did this agent do?" — the agent's action trail. */
  agentTrace(tenantId: string, agentName: string): AgentActionRecord[] {
    return this.list(tenantId, agentName);
  }

  /** Answer the four provenance questions about one action. */
  explain(tenantId: string, id: string): ActionExplanation {
    const r = this.get(tenantId, id);
    if (!r) throw new AgentObservabilityError(`No action ${id} in tenant ${tenantId}.`);
    const data = [
      r.tools_used.length ? `tools: ${r.tools_used.join(", ")}` : "",
      r.memory_used.length ? `memory: ${r.memory_used.join(", ")}` : "",
      r.input ? `input: ${r.input}` : "",
    ].filter(Boolean);
    return ActionExplanationSchema.parse({
      action_id: r.id,
      what_it_did: `${r.agent_name} performed "${r.task}" — outcome: ${r.outcome} (approval: ${r.approval_status}).`,
      why_it_did_that:
        r.decision || r.rationale
          ? `${r.decision}${r.decision && r.rationale ? " " : ""}${r.rationale}`.trim()
          : "No decision rationale was recorded for this action.",
      what_data_it_used: data.length ? data.join("; ") : "No tools, memory, or input were recorded.",
      what_changed_afterward: r.downstream_effects.length
        ? r.downstream_effects.join("; ")
        : "No downstream effects were recorded.",
    });
  }

  /** Build the aggregate dashboard. */
  dashboard(tenantId: string): ObservabilityDashboard {
    const rows = this.list(tenantId);
    const byAgent = new Map<string, AgentActionRecord[]>();
    for (const r of rows) {
      const arr = byAgent.get(r.agent_name) ?? [];
      arr.push(r);
      byAgent.set(r.agent_name, arr);
    }

    const performance: AgentPerformance[] = [];
    const cost_by_agent: { agent_name: string; cost_usd: number }[] = [];
    const roi_by_agent: { agent_name: string; roi: number | null }[] = [];
    const approval_bottlenecks: ApprovalBottleneck[] = [];

    for (const [agent, recs] of byAgent) {
      const successes = recs.filter((r) => r.outcome === "success").length;
      const failures = recs.filter((r) => FAIL_OUTCOMES.has(r.outcome)).length;
      const totalCost = recs.reduce((s, r) => s + r.cost_usd, 0);
      const totalValue = recs.reduce((s, r) => s + r.value_usd, 0);
      const roi = totalCost > 0 ? round2((totalValue - totalCost) / totalCost) : null;
      performance.push({
        agent_name: agent,
        actions: recs.length,
        successes,
        failures,
        success_rate: recs.length ? round2(successes / recs.length) : 0,
        avg_runtime_ms: recs.length ? round2(recs.reduce((s, r) => s + r.runtime_ms, 0) / recs.length) : 0,
        total_cost_usd: round2(totalCost),
        total_value_usd: round2(totalValue),
        roi,
      });
      cost_by_agent.push({ agent_name: agent, cost_usd: round2(totalCost) });
      roi_by_agent.push({ agent_name: agent, roi });

      const pending = recs.filter((r) => r.approval_status === "pending").length;
      const rejected = recs.filter((r) => r.approval_status === "rejected").length;
      if (pending + rejected > 0) {
        approval_bottlenecks.push({ agent_name: agent, pending_actions: pending, rejected_actions: rejected });
      }
    }

    // Repeated failures: same (agent, task) failing 2+ times.
    const failKey = new Map<string, { rec: AgentActionRecord; count: number; last_error: string }>();
    for (const r of rows) {
      if (!FAIL_OUTCOMES.has(r.outcome)) continue;
      const key = `${r.agent_name}|${r.task}`;
      const prev = failKey.get(key);
      failKey.set(key, {
        rec: r,
        count: (prev?.count ?? 0) + 1,
        last_error: r.errors[r.errors.length - 1] ?? prev?.last_error ?? "",
      });
    }
    const repeated_failures: RepeatedFailure[] = [...failKey.values()]
      .filter((v) => v.count >= 2)
      .map((v) => ({ agent_name: v.rec.agent_name, task: v.rec.task, count: v.count, last_error: v.last_error }));

    return {
      generated_at: this.clock().toISOString(),
      performance: performance.sort((a, b) => b.actions - a.actions),
      failed_actions: rows.filter((r) => FAIL_OUTCOMES.has(r.outcome)),
      cost_by_agent: cost_by_agent.sort((a, b) => b.cost_usd - a.cost_usd),
      roi_by_agent: roi_by_agent.sort((a, b) => (b.roi ?? -Infinity) - (a.roi ?? -Infinity)),
      risky_actions: rows.filter((r) => r.risk_level === "high"),
      approval_bottlenecks,
      repeated_failures,
    };
  }
}
