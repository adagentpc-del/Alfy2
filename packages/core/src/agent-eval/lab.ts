import {
  RegisterAgentEvalInputSchema,
  RunEvalInputSchema,
  AgentEvaluationSchema,
  EvalScoresSchema,
  type RegisterAgentEvalInput,
  type RunEvalInput,
  type AgentEvaluation,
  type EvalScores,
  type AgentEvalStage,
  type TestRunResult,
} from "@alfy2/shared";

/**
 * The Agent Evaluation Lab (docs/adr/ADR-0045-agent-evaluation-lab.md). Before any agent is trusted it is
 * tested against test tasks (with expected outputs, failure cases, and risk checks) and scored on
 * accuracy, usefulness, cost, speed, and reliability. Agents are promoted through stages and get NO broad
 * permissions until they pass evaluation and reach `approved`. Deterministic. Tenant-scoped.
 */

export class AgentEvalError extends Error {}

/** Promotion order. Reaching `approved` (and beyond) requires a passing evaluation. */
const STAGE_ORDER: AgentEvalStage[] = ["draft", "testing", "limited_use", "approved", "production", "retired"];
const GATED_STAGES: ReadonlySet<AgentEvalStage> = new Set<AgentEvalStage>(["approved", "production"]);

export interface AgentEvalOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class AgentEvaluationLab {
  private readonly evals = new Map<string, AgentEvaluation>();
  /** tenant|agent_key → id. */
  private readonly byAgent = new Map<string, string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: AgentEvalOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Register an agent for evaluation with its test cases (stage: draft). */
  register(tenantId: string, input: RegisterAgentEvalInput): AgentEvaluation {
    const i = RegisterAgentEvalInputSchema.parse(input);
    const now = this.clock().toISOString();
    const evaluation = AgentEvaluationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      agent_key: i.agent_key,
      stage: "draft",
      test_cases: i.test_cases,
      scores: null,
      passed: false,
      pass_threshold: i.pass_threshold,
      broad_permissions_allowed: false,
      notes: "",
      created_at: now,
      updated_at: now,
    });
    this.evals.set(evaluation.id, evaluation);
    this.byAgent.set(`${tenantId}|${i.agent_key}`, evaluation.id);
    return evaluation;
  }

  /**
   * Run the evaluation from observed test results. Computes the five scores, decides pass/fail (every
   * score over threshold AND no risk flagged on a normal/safe case), and moves the agent to `testing`.
   */
  run(tenantId: string, agentKey: string, input: RunEvalInput): AgentEvaluation {
    const ev = this.requireAgent(tenantId, agentKey);
    const { results } = RunEvalInputSchema.parse(input);
    const failureCases = new Set(ev.test_cases.filter((c) => c.is_failure_case).map((c) => c.name));

    const scores = this.score(results, failureCases);
    // A risk that triggers on a case that is NOT a designated failure/risk probe is a hard fail.
    const riskOnSafe = results.some((r) => r.risk_flagged && !failureCases.has(r.case_name));
    const allOverThreshold =
      scores.accuracy >= ev.pass_threshold &&
      scores.reliability >= ev.pass_threshold &&
      scores.usefulness >= ev.pass_threshold;
    const passed = allOverThreshold && !riskOnSafe;

    return this.save({
      ...ev,
      stage: ev.stage === "draft" ? "testing" : ev.stage,
      scores,
      passed,
      broad_permissions_allowed: passed && GATED_STAGES.has(ev.stage),
      notes: riskOnSafe ? "Risk triggered on a non-failure case — blocked." : passed ? "Passed evaluation." : "Below threshold.",
    });
  }

  /**
   * Promote an agent to a new stage. Gated stages (approved, production) REQUIRE a passing evaluation —
   * no agent gets broad permissions until it passes. Only forward moves (or retire) are allowed.
   */
  promote(tenantId: string, agentKey: string, to: AgentEvalStage): AgentEvaluation {
    const ev = this.requireAgent(tenantId, agentKey);
    if (to === "retired") return this.save({ ...ev, stage: "retired", broad_permissions_allowed: false });
    if (STAGE_ORDER.indexOf(to) <= STAGE_ORDER.indexOf(ev.stage)) {
      throw new AgentEvalError(`Cannot promote ${agentKey} from ${ev.stage} to ${to} (not a forward move).`);
    }
    if (GATED_STAGES.has(to) && !ev.passed) {
      throw new AgentEvalError(`Agent ${agentKey} cannot reach ${to} without passing evaluation. No broad permissions until it passes.`);
    }
    return this.save({ ...ev, stage: to, broad_permissions_allowed: GATED_STAGES.has(to) && ev.passed });
  }

  get(tenantId: string, agentKey: string): AgentEvaluation | undefined {
    const id = this.byAgent.get(`${tenantId}|${agentKey}`);
    const ev = id ? this.evals.get(id) : undefined;
    return ev && ev.tenant_id === tenantId ? ev : undefined;
  }

  list(tenantId: string): AgentEvaluation[] {
    return [...this.evals.values()].filter((e) => e.tenant_id === tenantId);
  }

  /** Whether an agent may hold broad permissions (passed AND at a gated stage). */
  hasBroadPermissions(tenantId: string, agentKey: string): boolean {
    return this.get(tenantId, agentKey)?.broad_permissions_allowed ?? false;
  }

  // --- internals ---

  private score(results: TestRunResult[], failureCases: Set<string>): EvalScores {
    const n = results.length;
    const reliability = results.filter((r) => r.passed).length / n;
    const normal = results.filter((r) => !failureCases.has(r.case_name));
    const accuracy = normal.length ? normal.filter((r) => r.passed).length / normal.length : reliability;
    const usefulness = mean(results.map((r) => r.usefulness));
    const avgCost = mean(results.map((r) => r.cost_usd));
    const avgSec = mean(results.map((r) => r.runtime_ms / 1000));
    return EvalScoresSchema.parse({
      accuracy: round(accuracy),
      usefulness: round(usefulness),
      cost: round(1 / (1 + avgCost)), // cheaper → higher
      speed: round(1 / (1 + avgSec)), // faster → higher
      reliability: round(reliability),
    });
  }

  private save(ev: AgentEvaluation): AgentEvaluation {
    const next = AgentEvaluationSchema.parse({ ...ev, updated_at: this.clock().toISOString() });
    this.evals.set(next.id, next);
    return next;
  }

  private requireAgent(tenantId: string, agentKey: string): AgentEvaluation {
    const ev = this.get(tenantId, agentKey);
    if (!ev) throw new AgentEvalError(`No evaluation for agent ${agentKey} in tenant ${tenantId}.`);
    return ev;
  }
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const round = (n: number): number => Math.round(n * 1000) / 1000;
