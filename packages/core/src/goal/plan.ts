import type {
  GoalAnalysis,
  GoalPlan,
  GoalType,
  WeeklyPlanItem,
  RiskItem,
  PriorityLevel,
} from "@alfy2/shared";
import { pathFor } from "./analyze.js";

/**
 * Deterministic plan generation from a goal's analysis: a weekly plan, daily priorities, recommended
 * agents and automations, an expected completion date, and a risk analysis. The Decision Engine
 * supplies priority, recommended agents, and automation opportunities (passed in via PlanContext); this
 * module shapes them into the executable plan and derives risks from the chosen path and constraints.
 */

/** Default agent key per goal type, unioned with whatever the Decision Engine recommends. */
const TYPE_AGENT: Record<GoalType, string> = {
  personal: "chief-of-staff",
  financial: "finance",
  business: "operations",
  health: "chief-of-staff",
  learning: "chief-of-staff",
  relationships: "chief-of-staff",
  launches: "marketing",
  sales: "sales",
  cash_flow: "finance",
};

export interface PlanContext {
  now: Date;
  priorityLevel: PriorityLevel;
  recommendedAgents: string[];
  automations: string[];
}

const unique = (xs: string[]): string[] => [...new Set(xs.filter(Boolean))];

function weeklyPlan(analysis: GoalAnalysis, weeks: number): WeeklyPlanItem[] {
  const path = pathFor(analysis, analysis.recommended_path);
  const steps = path.steps;
  const out: WeeklyPlanItem[] = [];
  const span = Math.max(1, Math.min(weeks, 12)); // cap the rendered horizon at 12 weeks
  for (let w = 1; w <= span; w += 1) {
    const step = steps[Math.min(steps.length - 1, Math.floor(((w - 1) / span) * steps.length))]!;
    out.push({
      week: w,
      focus: w === 1 ? `Kick off: ${step}` : step,
      milestones: w === span ? ["Goal target reached or re-reviewed"] : [`Progress checkpoint for week ${w}`],
      outcome: w === span ? "Goal complete or queued for review" : "",
    });
  }
  return out;
}

function risks(analysis: GoalAnalysis): { items: RiskItem[]; summary: string } {
  const items: RiskItem[] = [];
  for (const c of analysis.constraints) {
    if (c.severity !== "low") {
      items.push({
        description: `Constraint may block progress: ${c.description}`,
        likelihood: c.severity,
        impact: c.severity === "high" ? "high" : "medium",
        mitigation: "Automate or delegate around the constraint; escalate for approval if it needs resources.",
      });
    }
  }
  const path = pathFor(analysis, analysis.recommended_path);
  if (path.risk_level !== "low") {
    items.push({
      description: `The ${path.kind.replace("_", "-")} path carries ${path.risk_level} execution risk.`,
      likelihood: "medium",
      impact: path.risk_level,
      mitigation: "Stage the work in checkpoints; recalculate if a checkpoint slips.",
    });
  }
  if (items.length === 0) {
    items.push({
      description: "Main risk is loss of consistency over time.",
      likelihood: "medium",
      impact: "medium",
      mitigation: "Lock weekly checkpoints and daily priorities; let the engine recalculate on drift.",
    });
  }
  const summary = `${items.length} risk${items.length === 1 ? "" : "s"} identified; the dominant one is "${items[0]!.description}".`;
  return { items, summary };
}

export function buildPlan(
  type: GoalType,
  analysis: GoalAnalysis,
  deadline: string | null,
  ctx: PlanContext,
): GoalPlan {
  const path = pathFor(analysis, analysis.recommended_path);
  const completion = new Date(ctx.now.getTime() + path.estimated_days * 86_400_000);
  const expected_completion = deadline && new Date(deadline) < completion ? completion : completion; // engine estimate
  const weeks = Math.max(1, Math.ceil(path.estimated_days / 7));

  const daily_priorities = unique([
    path.steps[0]!,
    analysis.best_opportunities[0]!.description,
    "Log one measurable unit of progress",
  ]).slice(0, 3);

  const recommended_agents = unique([TYPE_AGENT[type], ...ctx.recommendedAgents]);
  const recommended_automations = unique([
    ...ctx.automations,
    "Weekly progress check-in and recalculation trigger",
    "Daily priority reminder",
  ]);

  const { items, summary } = risks(analysis);

  return {
    weekly_plan: weeklyPlan(analysis, weeks),
    daily_priorities,
    recommended_agents,
    recommended_automations,
    expected_completion: expected_completion.toISOString(),
    risk_analysis: items,
    risk_summary: summary,
  };
}
