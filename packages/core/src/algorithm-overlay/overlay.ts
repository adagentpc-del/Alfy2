import {
  AlgorithmDescriptorSchema,
  AlgorithmScoreSchema,
  ScoreRequestSchema,
  type AlgorithmDescriptor,
  type AlgorithmId,
  type AlgorithmScore,
  type ScoreRequest,
} from "@alfy2/shared";

/**
 * The Algorithm Overlay System (docs/adr/ADR-0066-algorithm-overlay.md). Fifteen reusable scoring
 * algorithms that sit above agents, workflows, goals, businesses, campaigns, and tasks. Each algorithm
 * is transparent: a purpose, expected inputs, a simple rules-based formula (Phase 1), a 0..1 score, a
 * confidence (how much of the expected signal was present), and an explanation. Every result states why
 * it scored as it did, what data was used, what's missing, the recommended action, and whether approval
 * is required. Deterministic. The weighted/historical/predictive phases swap in behind the same surface.
 */

const EPSILON = 1e-6;

/** Per-algorithm scoring spec: the signals it expects and how to combine them into a 0..1 score. */
interface AlgorithmSpec {
  /** Signal keys the formula expects (drives confidence + data_missing). */
  expects: string[];
  /** Compute the raw 0..1 score from the available signals. */
  compute: (s: Record<string, number>) => number;
  /** Short rationale fragment when the score is high. */
  highWhy: string;
  /** Short rationale fragment when the score is low. */
  lowWhy: string;
  /** Recommended action given the score. */
  action: (score: number) => string;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Mean of the expected signals that are present; falls back to 0.5 when none are. */
const meanOf = (s: Record<string, number>, keys: string[]): number => {
  const vals = keys.map((k) => s[k]).filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return 0.5;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

/** Normalized value/cost ratio, mapped onto 0..1 (ratio of 2x → ~0.67, breakeven → 0.5). */
const roiNorm = (value: number, cost: number): number => {
  const ratio = value / Math.max(cost, EPSILON);
  return clamp01(ratio / (ratio + 1));
};

/** Algorithms that always require human approval above a high-confidence/score threshold. */
const APPROVAL_ALGORITHMS: ReadonlySet<AlgorithmId> = new Set<AlgorithmId>([
  "risk",
  "portfolio_allocation",
  "fastest_path_to_cash",
]);
const APPROVAL_THRESHOLD = 0.7;

const SPECS: Record<AlgorithmId, AlgorithmSpec> = {
  priority: {
    expects: ["urgency", "importance", "revenue_impact"],
    compute: (s) => clamp01(meanOf(s, ["urgency", "importance", "revenue_impact"])),
    highWhy: "high urgency, importance, and revenue impact",
    lowWhy: "low urgency, importance, or revenue impact",
    action: (n) => (n >= 0.7 ? "Do this next." : n >= 0.4 ? "Schedule it." : "Defer or drop it."),
  },
  roi: {
    expects: ["value", "cost"],
    compute: (s) => roiNorm(s.value ?? 0.5, s.cost ?? 0.5),
    highWhy: "value far exceeds cost",
    lowWhy: "cost is close to or above value",
    action: (n) => (n >= 0.6 ? "Invest — the return justifies it." : "Reduce cost or grow value before investing."),
  },
  fastest_path_to_cash: {
    expects: ["revenue_impact", "speed", "ease"],
    compute: (s) => clamp01(0.5 * (s.revenue_impact ?? 0.5) + 0.3 * (s.speed ?? 0.5) + 0.2 * (s.ease ?? 0.5)),
    highWhy: "fast, easy, and high revenue impact",
    lowWhy: "slow, hard, or low revenue impact",
    action: (n) => (n >= 0.7 ? "Pursue this money move now." : "Find a faster, lower-friction path to cash."),
  },
  friction: {
    expects: ["ease"],
    compute: (s) => clamp01(1 - (s.ease ?? 0.5)),
    highWhy: "the path is hard and full of friction",
    lowWhy: "the path is smooth and easy",
    action: (n) => (n >= 0.6 ? "Remove blockers before proceeding." : "Low friction — proceed."),
  },
  conversion_probability: {
    expects: ["intent", "fit", "engagement"],
    compute: (s) => clamp01(meanOf(s, ["intent", "fit", "engagement"])),
    highWhy: "strong intent, fit, and engagement",
    lowWhy: "weak intent, fit, or engagement",
    action: (n) => (n >= 0.6 ? "Push to close." : "Nurture before pushing to close."),
  },
  agent_need_detection: {
    expects: ["volume", "repetition", "manual_effort"],
    compute: (s) => clamp01(meanOf(s, ["volume", "repetition", "manual_effort"])),
    highWhy: "high volume, repetitive, manual work",
    lowWhy: "low volume or non-repetitive work",
    action: (n) => (n >= 0.6 ? "Build or assign an agent for this." : "Not worth automating yet."),
  },
  opportunity_matching: {
    expects: ["fit", "timing", "capacity"],
    compute: (s) => clamp01(meanOf(s, ["fit", "timing", "capacity"])),
    highWhy: "strong fit, good timing, available capacity",
    lowWhy: "weak fit, poor timing, or no capacity",
    action: (n) => (n >= 0.6 ? "Match and pursue this opportunity." : "Hold — fit or timing is off."),
  },
  business_health: {
    expects: ["revenue_trend", "margin", "retention", "runway"],
    compute: (s) => clamp01(meanOf(s, ["revenue_trend", "margin", "retention", "runway"])),
    highWhy: "healthy revenue, margin, retention, and runway",
    lowWhy: "weak revenue, margin, retention, or runway",
    action: (n) => (n >= 0.6 ? "Healthy — keep investing." : "Stabilize the weak metric before scaling."),
  },
  goal_gap: {
    expects: ["target", "current"],
    compute: (s) => clamp01(1 - clamp01((s.current ?? 0.5) / Math.max(s.target ?? 1, EPSILON))),
    highWhy: "a large gap remains to the target",
    lowWhy: "the goal is nearly met",
    action: (n) => (n >= 0.6 ? "Big gap — accelerate or re-resource." : "On track — maintain pace."),
  },
  risk: {
    expects: ["likelihood", "severity", "exposure"],
    compute: (s) => clamp01(meanOf(s, ["likelihood", "severity", "exposure"])),
    highWhy: "high likelihood, severity, and exposure",
    lowWhy: "low likelihood, severity, or exposure",
    action: (n) => (n >= 0.7 ? "Mitigate now — escalate for approval." : "Monitor the risk."),
  },
  pattern_prediction: {
    expects: ["signal_strength", "consistency", "sample_size"],
    compute: (s) => clamp01(meanOf(s, ["signal_strength", "consistency", "sample_size"])),
    highWhy: "a strong, consistent pattern with enough samples",
    lowWhy: "a weak or inconsistent pattern",
    action: (n) => (n >= 0.6 ? "Act on the predicted pattern." : "Gather more evidence first."),
  },
  energy_aware_scheduling: {
    expects: ["task_demand", "available_energy"],
    compute: (s) => clamp01(1 - Math.abs((s.task_demand ?? 0.5) - (s.available_energy ?? 0.5))),
    highWhy: "task demand matches available energy",
    lowWhy: "task demand is mismatched with available energy",
    action: (n) => (n >= 0.6 ? "Good time to do this task." : "Reschedule to match energy."),
  },
  knowledge_to_money: {
    expects: ["actionability", "demand", "monetization_path"],
    compute: (s) => clamp01(meanOf(s, ["actionability", "demand", "monetization_path"])),
    highWhy: "actionable, in-demand, with a clear monetization path",
    lowWhy: "low actionability, demand, or monetization path",
    action: (n) => (n >= 0.6 ? "Convert this knowledge into an offer." : "Refine the monetization angle first."),
  },
  portfolio_allocation: {
    expects: ["expected_return", "strategic_fit", "risk"],
    compute: (s) => clamp01(0.4 * (s.expected_return ?? 0.5) + 0.3 * (s.strategic_fit ?? 0.5) + 0.3 * (1 - (s.risk ?? 0.5))),
    highWhy: "strong expected return and strategic fit at acceptable risk",
    lowWhy: "weak return, fit, or excessive risk",
    action: (n) => (n >= 0.7 ? "Allocate more — escalate for approval." : "Hold current allocation."),
  },
  ab_test_winner: {
    expects: ["lift", "significance", "sample_size"],
    compute: (s) => clamp01(meanOf(s, ["lift", "significance", "sample_size"])),
    highWhy: "clear lift with strong significance and sample size",
    lowWhy: "small lift or weak significance",
    action: (n) => (n >= 0.6 ? "Ship the winning variant." : "Keep testing — no clear winner."),
  },
};

const DESCRIPTORS: Record<AlgorithmId, Omit<AlgorithmDescriptor, "id" | "formula"> & { formula: string }> = {
  priority: {
    name: "Priority",
    purpose: "Rank what to do next across tasks, goals, and businesses.",
    inputs: ["urgency", "importance", "revenue_impact"],
    output: "A 0..1 priority score.",
    formula: "mean(urgency, importance, revenue_impact)",
    dashboard_use: "Orders the today/this-week task and goal lists.",
    agent_use: "Tells an agent which item to pick up first.",
  },
  roi: {
    name: "ROI",
    purpose: "Estimate the return on an effort or spend relative to its cost.",
    inputs: ["value", "cost"],
    output: "A 0..1 normalized return score.",
    formula: "ratio = value / max(cost, eps); ratio / (ratio + 1)",
    dashboard_use: "Sorts initiatives by return.",
    agent_use: "Gates spend decisions by expected return.",
  },
  fastest_path_to_cash: {
    name: "Fastest Path to Cash",
    purpose: "Surface the quickest, lowest-friction money move.",
    inputs: ["revenue_impact", "speed", "ease"],
    output: "A 0..1 speed-to-cash score.",
    formula: "0.5*revenue_impact + 0.3*speed + 0.2*ease",
    dashboard_use: "Highlights the next money move.",
    agent_use: "Routes revenue agents to the fastest win.",
  },
  friction: {
    name: "Friction",
    purpose: "Measure how much resistance a path carries.",
    inputs: ["ease"],
    output: "A 0..1 friction score (higher = harder).",
    formula: "1 - ease",
    dashboard_use: "Flags high-friction steps to fix.",
    agent_use: "Tells agents where to remove blockers first.",
  },
  conversion_probability: {
    name: "Conversion Probability",
    purpose: "Estimate the chance a lead or deal converts.",
    inputs: ["intent", "fit", "engagement"],
    output: "A 0..1 conversion likelihood.",
    formula: "mean(intent, fit, engagement)",
    dashboard_use: "Sorts the pipeline by likelihood to close.",
    agent_use: "Decides whether to push or nurture.",
  },
  agent_need_detection: {
    name: "Agent Need Detection",
    purpose: "Detect repetitive manual work worth automating with an agent.",
    inputs: ["volume", "repetition", "manual_effort"],
    output: "A 0..1 automation-need score.",
    formula: "mean(volume, repetition, manual_effort)",
    dashboard_use: "Recommends where to deploy a new agent.",
    agent_use: "Triggers agent-generation proposals.",
  },
  opportunity_matching: {
    name: "Opportunity Matching",
    purpose: "Match an opportunity to current fit, timing, and capacity.",
    inputs: ["fit", "timing", "capacity"],
    output: "A 0..1 match score.",
    formula: "mean(fit, timing, capacity)",
    dashboard_use: "Ranks inbound opportunities.",
    agent_use: "Filters opportunities agents should pursue.",
  },
  business_health: {
    name: "Business Health",
    purpose: "Summarize a business's overall health.",
    inputs: ["revenue_trend", "margin", "retention", "runway"],
    output: "A 0..1 health score.",
    formula: "mean(revenue_trend, margin, retention, runway)",
    dashboard_use: "Color-codes each business in the portfolio.",
    agent_use: "Triggers stabilization workflows when low.",
  },
  goal_gap: {
    name: "Goal Gap",
    purpose: "Measure how far a goal is from its target.",
    inputs: ["target", "current"],
    output: "A 0..1 gap score (higher = further behind).",
    formula: "1 - clamp(current / max(target, eps))",
    dashboard_use: "Shows progress bars and at-risk goals.",
    agent_use: "Decides whether to re-resource a goal.",
  },
  risk: {
    name: "Risk",
    purpose: "Score the risk of an action or situation.",
    inputs: ["likelihood", "severity", "exposure"],
    output: "A 0..1 risk score.",
    formula: "mean(likelihood, severity, exposure)",
    dashboard_use: "Surfaces the top open risks.",
    agent_use: "Escalates high risk for human approval.",
  },
  pattern_prediction: {
    name: "Pattern Prediction",
    purpose: "Predict the strength of an emerging pattern.",
    inputs: ["signal_strength", "consistency", "sample_size"],
    output: "A 0..1 confidence in the pattern.",
    formula: "mean(signal_strength, consistency, sample_size)",
    dashboard_use: "Highlights trends worth acting on.",
    agent_use: "Feeds predictive automations.",
  },
  energy_aware_scheduling: {
    name: "Energy-Aware Scheduling",
    purpose: "Match task demand to the available energy in the moment.",
    inputs: ["task_demand", "available_energy"],
    output: "A 0..1 fit score for scheduling now.",
    formula: "1 - |task_demand - available_energy|",
    dashboard_use: "Suggests the best time of day for a task.",
    agent_use: "Schedules deep work against energy.",
  },
  knowledge_to_money: {
    name: "Knowledge to Money",
    purpose: "Score how readily a piece of knowledge can be monetized.",
    inputs: ["actionability", "demand", "monetization_path"],
    output: "A 0..1 monetization score.",
    formula: "mean(actionability, demand, monetization_path)",
    dashboard_use: "Ranks vault items by money potential.",
    agent_use: "Routes high-value knowledge into offers.",
  },
  portfolio_allocation: {
    name: "Portfolio Allocation",
    purpose: "Score how much to allocate to an initiative.",
    inputs: ["expected_return", "strategic_fit", "risk"],
    output: "A 0..1 allocation score.",
    formula: "0.4*expected_return + 0.3*strategic_fit + 0.3*(1 - risk)",
    dashboard_use: "Drives capital and attention allocation.",
    agent_use: "Escalates large allocations for approval.",
  },
  ab_test_winner: {
    name: "A/B Test Winner",
    purpose: "Decide whether an A/B test has a clear winner.",
    inputs: ["lift", "significance", "sample_size"],
    output: "A 0..1 winner-confidence score.",
    formula: "mean(lift, significance, sample_size)",
    dashboard_use: "Marks experiments ready to ship.",
    agent_use: "Auto-promotes winning variants.",
  },
};

export class AlgorithmOverlaySystem {
  /** Static descriptors for all fifteen algorithms. */
  static readonly ALGORITHMS: AlgorithmDescriptor[] = (Object.keys(SPECS) as AlgorithmId[]).map((id) =>
    AlgorithmDescriptorSchema.parse({ id, ...DESCRIPTORS[id] }),
  );

  private readonly descriptorsById: Map<AlgorithmId, AlgorithmDescriptor>;

  constructor(_options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.descriptorsById = new Map(AlgorithmOverlaySystem.ALGORITHMS.map((d) => [d.id, d]));
  }

  /** All algorithm descriptors. */
  descriptors(): AlgorithmDescriptor[] {
    return [...this.descriptorsById.values()];
  }

  /** One algorithm descriptor. */
  descriptor(id: AlgorithmId): AlgorithmDescriptor | undefined {
    return this.descriptorsById.get(id);
  }

  /** Score a subject with the requested algorithm. */
  score(req: ScoreRequest): AlgorithmScore {
    const r = ScoreRequestSchema.parse(req);
    const spec = SPECS[r.algorithm];

    const present = spec.expects.filter((k) => typeof r.signals[k] === "number");
    const missing = spec.expects.filter((k) => typeof r.signals[k] !== "number");
    const providedKeys = Object.keys(r.signals);

    const overridden = r.override != null;
    const computed = overridden ? clamp01(r.override as number) : clamp01(spec.compute(r.signals));
    const score = round(computed);
    const confidence = round(spec.expects.length === 0 ? 1 : present.length / spec.expects.length);

    const why = overridden
      ? `Manually overridden to ${score}.`
      : score >= 0.5
        ? `Scored ${score} — ${spec.highWhy}.`
        : `Scored ${score} — ${spec.lowWhy}.`;

    const requires_approval = APPROVAL_ALGORITHMS.has(r.algorithm) && score >= APPROVAL_THRESHOLD;

    return AlgorithmScoreSchema.parse({
      algorithm: r.algorithm,
      subject: r.subject,
      phase: "rules_based",
      score,
      confidence,
      why,
      data_used: present.length > 0 ? present : providedKeys,
      data_missing: missing,
      recommended_action: spec.action(score),
      requires_approval,
      overridden,
    });
  }
}
