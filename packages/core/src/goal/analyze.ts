import type {
  CreateGoalInput,
  GoalAnalysis,
  GoalType,
  GoalPath,
  PathKind,
  Constraint,
  Resource,
  Opportunity,
  ResourceKind,
  Level,
} from "@alfy2/shared";

/**
 * Deterministic situation analysis for a goal: current/desired state, the gap, constraints, resources,
 * best opportunities, and the three candidate paths (fastest / lowest-resistance / highest-ROI) with a
 * recommended path. No AI — pure, explainable heuristics keyed off the goal type and the inputs.
 */

/** Per-type opportunity and resource hints — the leverage points the engine surfaces by default. */
const TYPE_OPPORTUNITIES: Record<GoalType, string[]> = {
  personal: ["Build a daily keystone habit", "Remove one recurring time sink"],
  financial: ["Automate savings/allocations", "Cut the largest recurring expense"],
  business: ["Double down on the highest-margin offer", "Systematize the top revenue workflow"],
  health: ["Anchor one non-negotiable daily action", "Track the single most predictive metric"],
  learning: ["Spaced-repetition the core concepts", "Ship a small project to force recall"],
  relationships: ["Schedule recurring quality touchpoints", "Lead with a specific shared activity"],
  launches: ["Pre-sell before building", "Reuse existing audience for distribution"],
  sales: ["Reactivate warm and past customers", "Tighten the highest-drop pipeline stage"],
  cash_flow: ["Convert one-off revenue to recurring", "Accelerate receivables; smooth payables"],
};

const inferResourceKind = (text: string): ResourceKind => {
  const t = text.toLowerCase();
  if (/\b(partner|network|referral|relationship|contact|audience|community)\b/.test(t)) return "relationship";
  if (/\b(\$|budget|capital|cash|money|fund)\b/.test(t)) return "money";
  if (/\b(team|hire|assistant|editor|staff|people|delegate)\b/.test(t)) return "people";
  if (/\b(tool|software|app|platform|system|automation)\b/.test(t)) return "tool";
  if (/\b(skill|knowledge|experience|expertise|course|playbook)\b/.test(t)) return "knowledge";
  if (/\b(time|hours?|schedule|calendar)\b/.test(t)) return "time";
  return "other";
};

const severityOf = (text: string): Level => {
  const t = text.toLowerCase();
  if (/\b(no |none|blocked|cannot|can't|critical|severe|hard stop|legal|compliance)\b/.test(t)) return "high";
  if (/\b(limited|tight|few|some|partial|short on)\b/.test(t)) return "medium";
  return "low";
};

function describeGap(input: CreateGoalInput): string {
  const { baseline_value, current_value, target_value, unit, metric } = input;
  const from = current_value ?? baseline_value;
  if (from !== null && from !== undefined && target_value !== null && target_value !== undefined) {
    const delta = Math.round((target_value - from) * 100) / 100;
    const u = unit ? ` ${unit}` : "";
    const m = metric ? ` of ${metric}` : "";
    return `${delta}${u}${m} to close (from ${from}${u} to ${target_value}${u}).`;
  }
  return `Close the distance between "${input.current_state}" and "${input.desired_state}".`;
}

function makePath(
  kind: PathKind,
  type: GoalType,
  opportunities: Opportunity[],
  baseDays: number,
): GoalPath {
  const lead = opportunities[0]?.description ?? "Take the first concrete step";
  const second = opportunities[1]?.description ?? "Build momentum with a repeatable action";
  if (kind === "fastest") {
    return {
      kind,
      summary: "Move now using what already exists.",
      steps: [`Inventory current assets and demand`, lead, `Execute in a focused sprint`],
      rationale: "Reuses existing resources and demand for the quickest movement on the gap.",
      estimated_days: Math.max(7, Math.round(baseDays * 0.6)),
      risk_level: "medium",
    };
  }
  if (kind === "lowest_resistance") {
    return {
      kind,
      summary: "Follow the path of least friction.",
      steps: [`Lean on warm channels and habits`, second, `Sustain a light, consistent cadence`],
      rationale: "Lowest effort and risk; relies on warm channels and existing routines.",
      estimated_days: Math.max(14, Math.round(baseDays * 1.0)),
      risk_level: "low",
    };
  }
  return {
    kind,
    summary: "Build the compounding, highest-return asset.",
    steps: [`Design the durable asset/system`, lead, `Scale once it works`],
    rationale: "Highest return over time by building something that compounds, at higher up-front cost.",
    estimated_days: Math.max(21, Math.round(baseDays * 1.6)),
    risk_level: "high",
  };
}

function chooseRecommended(
  input: CreateGoalInput,
  constraints: Constraint[],
  daysToDeadline: number | null,
): { kind: PathKind; why: string } {
  if (daysToDeadline !== null && daysToDeadline <= 45) {
    return { kind: "fastest", why: "the deadline is near, so speed dominates" };
  }
  const highConstraints = constraints.filter((c) => c.severity === "high").length;
  if (highConstraints >= 1) {
    return { kind: "lowest_resistance", why: "hard constraints favor the lowest-resistance route" };
  }
  return { kind: "highest_roi", why: "there is room to build the compounding, highest-return asset" };
}

export function analyzeGoal(input: CreateGoalInput, now: Date): GoalAnalysis {
  const constraints: Constraint[] = input.constraints.map((c) => ({ description: c, severity: severityOf(c) }));
  const resources: Resource[] = input.resources.map((r) => ({ description: r, kind: inferResourceKind(r) }));
  const best_opportunities: Opportunity[] = TYPE_OPPORTUNITIES[input.type].map((o, i) => ({
    description: o,
    leverage: i === 0 ? "high" : "medium",
  }));

  const daysToDeadline =
    input.deadline !== null
      ? Math.max(0, Math.round((new Date(input.deadline).getTime() - now.getTime()) / 86_400_000))
      : null;
  const baseDays = daysToDeadline && daysToDeadline > 0 ? daysToDeadline : 60;

  const fastest_path = makePath("fastest", input.type, best_opportunities, baseDays);
  const lowest_resistance_path = makePath("lowest_resistance", input.type, best_opportunities, baseDays);
  const highest_roi_path = makePath("highest_roi", input.type, best_opportunities, baseDays);

  const { kind: recommended_path, why } = chooseRecommended(input, constraints, daysToDeadline);

  return {
    current_state: input.current_state,
    desired_state: input.desired_state,
    gap: describeGap(input),
    constraints,
    resources,
    best_opportunities,
    fastest_path,
    lowest_resistance_path,
    highest_roi_path,
    recommended_path,
    explanation:
      `Recommending the ${recommended_path.replace("_", "-")} path because ${why}. ` +
      `Best leverage: ${best_opportunities[0]!.description.toLowerCase()}.`,
  };
}

/** The path object for a chosen kind. */
export function pathFor(analysis: GoalAnalysis, kind: PathKind): GoalPath {
  return kind === "fastest"
    ? analysis.fastest_path
    : kind === "lowest_resistance"
      ? analysis.lowest_resistance_path
      : analysis.highest_roi_path;
}
