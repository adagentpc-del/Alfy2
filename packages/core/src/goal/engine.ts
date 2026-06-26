import {
  CreateGoalInputSchema,
  GoalSchema,
  GoalChangeSchema,
  type CreateGoalInput,
  type Goal,
  type GoalChange,
  type GoalStatus,
  type PriorityLevel,
} from "@alfy2/shared";
import { DecisionEngine } from "../decision/engine.js";
import { analyzeGoal } from "./analyze.js";
import { buildPlan, type PlanContext } from "./plan.js";

/**
 * The Goal Engine (docs/adr/ADR-0016-goal-engine.md). Turns a desired outcome into a continuously
 * pursued plan: for every goal it determines current/desired state, the gap, constraints, resources,
 * best opportunities, and three paths (fastest / lowest-resistance / highest-ROI), then generates a
 * weekly plan, daily priorities, recommended agents/automations, an expected completion, and a risk
 * analysis. Composes the Decision Engine for priority + agents + automations. Deterministic.
 *
 * Lifecycle: a goal is `draft` until approved; an approved goal is `active` (pursued) and stays pursued
 * until it is `completed`, `paused`, `cancelled`, or `review_required`. When a goal changes, the engine
 * recalculates (re-analyzes, re-plans, bumps `version`). Tenant-scoped.
 */

export class GoalEngineError extends Error {}

export interface GoalEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
  decisions?: DecisionEngine;
}

/** A goal is actively pursued only while `active`. */
const PURSUED: GoalStatus = "active";
const TERMINAL: ReadonlySet<GoalStatus> = new Set<GoalStatus>(["completed", "cancelled"]);

export class GoalEngine {
  private readonly goals = new Map<string, Goal>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly decisions: DecisionEngine;

  constructor(options: GoalEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.decisions = options.decisions ?? new DecisionEngine({ clock: this.clock, idFactory: this.newId });
  }

  /** Define a new goal. Produces the full analysis + plan but stays a DRAFT until approved. */
  async define(tenantId: string, input: CreateGoalInput): Promise<Goal> {
    const i = CreateGoalInputSchema.parse(input);
    const now = this.clock();
    const { analysis, plan, priorityLevel } = await this.computePlan(tenantId, i, now);

    const goal: Goal = GoalSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      type: i.type,
      title: i.title,
      description: i.description,
      status: "draft",
      approved: false,
      business_id: i.business_id,
      metric: i.metric,
      unit: i.unit,
      baseline_value: i.baseline_value,
      current_value: i.current_value,
      target_value: i.target_value,
      deadline: i.deadline,
      priority_level: priorityLevel,
      analysis,
      plan,
      version: 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      last_recalculated_at: null,
    });
    this.goals.set(goal.id, goal);
    return goal;
  }

  /** Approve a goal so it is actively pursued. Valid from draft / paused / review_required. */
  approve(tenantId: string, id: string): Goal {
    const goal = this.require(tenantId, id);
    if (TERMINAL.has(goal.status)) {
      throw new GoalEngineError(`Goal ${id} is ${goal.status} and cannot be approved.`);
    }
    return this.save({ ...goal, approved: true, status: PURSUED });
  }

  /**
   * Recalculate a goal after it changes. Re-analyzes and re-plans, bumps `version`, stamps
   * `last_recalculated_at`. A goal in `review_required` becomes `active` again (the review is resolved
   * by the change). Terminal goals (completed/cancelled) cannot be recalculated.
   */
  async recalculate(tenantId: string, id: string, change: GoalChange): Promise<Goal> {
    const goal = this.require(tenantId, id);
    if (TERMINAL.has(goal.status)) {
      throw new GoalEngineError(`Goal ${id} is ${goal.status} and cannot be recalculated.`);
    }
    const c = GoalChangeSchema.parse(change);
    const merged = this.mergeChange(goal, c);
    const now = this.clock();
    const { analysis, plan, priorityLevel } = await this.computePlan(tenantId, merged.input, now);

    const status: GoalStatus = goal.status === "review_required" ? PURSUED : goal.status;
    return this.save({
      ...goal,
      ...merged.fields,
      priority_level: priorityLevel,
      analysis,
      plan,
      status,
      version: goal.version + 1,
      updated_at: now.toISOString(),
      last_recalculated_at: now.toISOString(),
    });
  }

  /**
   * Record measured progress. If the target is reached the goal auto-completes; otherwise the gap
   * changed, so the engine recalculates the plan.
   */
  async recordProgress(tenantId: string, id: string, currentValue: number): Promise<Goal> {
    const goal = this.require(tenantId, id);
    if (TERMINAL.has(goal.status)) {
      throw new GoalEngineError(`Goal ${id} is ${goal.status}; progress cannot be recorded.`);
    }
    if (goal.target_value !== null && this.targetReached(goal, currentValue)) {
      const now = this.clock();
      return this.save({
        ...goal,
        current_value: currentValue,
        status: "completed",
        updated_at: now.toISOString(),
      });
    }
    return this.recalculate(tenantId, id, { ...emptyChange(), current_value: currentValue });
  }

  /** Pause pursuit (can later be approved again). */
  pause(tenantId: string, id: string): Goal {
    return this.transition(tenantId, id, "paused");
  }

  /** Cancel the goal — terminal. */
  cancel(tenantId: string, id: string): Goal {
    return this.transition(tenantId, id, "cancelled");
  }

  /** Mark the goal complete — terminal. */
  complete(tenantId: string, id: string): Goal {
    return this.transition(tenantId, id, "completed");
  }

  /** Flag the goal for human review — pauses pursuit until reviewed (a recalculation resumes it). */
  requireReview(tenantId: string, id: string): Goal {
    return this.transition(tenantId, id, "review_required");
  }

  /** Goals still being actively pursued (status `active`). The engine never stops these on its own. */
  activeGoals(tenantId: string): Goal[] {
    return [...this.goals.values()].filter((g) => g.tenant_id === tenantId && g.status === PURSUED);
  }

  get(tenantId: string, id: string): Goal | undefined {
    const g = this.goals.get(id);
    return g && g.tenant_id === tenantId ? g : undefined;
  }

  list(tenantId: string, status?: GoalStatus): Goal[] {
    return [...this.goals.values()].filter(
      (g) => g.tenant_id === tenantId && (status ? g.status === status : true),
    );
  }

  // --- internals ---

  private async computePlan(
    tenantId: string,
    input: CreateGoalInput,
    now: Date,
  ): Promise<{ analysis: Goal["analysis"]; plan: Goal["plan"]; priorityLevel: PriorityLevel }> {
    const analysis = analyzeGoal(input, now);
    const decision = await this.decisions.decide(tenantId, {
      text: `${input.title}. Desired: ${input.desired_state}`,
      source: "goal",
      context: {
        ...(input.deadline ? { deadline: input.deadline } : {}),
        goal_type: input.type,
      },
    });
    const ctx: PlanContext = {
      now,
      priorityLevel: decision.priority_level,
      recommendedAgents: decision.recommended_agents,
      automations: decision.automation_opportunities,
    };
    const plan = buildPlan(input.type, analysis, input.deadline, ctx);
    return { analysis, plan, priorityLevel: decision.priority_level };
  }

  /** Apply a GoalChange onto a goal, returning the reconstructed CreateGoalInput + changed columns. */
  private mergeChange(
    goal: Goal,
    c: GoalChange,
  ): { input: CreateGoalInput; fields: Partial<Goal> } {
    const desired_state = c.desired_state ?? goal.analysis.desired_state;
    const target_value = c.target_value ?? goal.target_value;
    const current_value = c.current_value ?? goal.current_value;
    const deadline = c.deadline ?? goal.deadline;
    const constraints = [
      ...goal.analysis.constraints.map((x) => x.description),
      ...c.add_constraints,
    ];
    const resources = [...goal.analysis.resources.map((x) => x.description), ...c.add_resources];

    const input = CreateGoalInputSchema.parse({
      type: goal.type,
      title: goal.title,
      description: goal.description,
      current_state:
        current_value !== null && goal.metric
          ? `${goal.metric} is ${current_value}${goal.unit ? ` ${goal.unit}` : ""}.`
          : goal.analysis.current_state,
      desired_state,
      business_id: goal.business_id,
      metric: goal.metric,
      unit: goal.unit,
      baseline_value: goal.baseline_value,
      current_value,
      target_value,
      deadline,
      constraints,
      resources,
    });
    return {
      input,
      fields: { target_value, current_value, deadline },
    };
  }

  private targetReached(goal: Goal, value: number): boolean {
    const target = goal.target_value!;
    const baseline = goal.baseline_value ?? goal.current_value ?? 0;
    // Increasing goal (target above baseline) vs decreasing goal (target below baseline).
    return target >= baseline ? value >= target : value <= target;
  }

  private transition(tenantId: string, id: string, status: GoalStatus): Goal {
    const goal = this.require(tenantId, id);
    if (TERMINAL.has(goal.status)) {
      throw new GoalEngineError(`Goal ${id} is ${goal.status} and cannot transition to ${status}.`);
    }
    return this.save({ ...goal, status });
  }

  private save(goal: Goal): Goal {
    const next = GoalSchema.parse({ ...goal, updated_at: this.clock().toISOString() });
    this.goals.set(next.id, next);
    return next;
  }

  private require(tenantId: string, id: string): Goal {
    const g = this.get(tenantId, id);
    if (!g) throw new GoalEngineError(`No goal ${id} in tenant ${tenantId}.`);
    return g;
  }
}

function emptyChange(): GoalChange {
  return GoalChangeSchema.parse({});
}
