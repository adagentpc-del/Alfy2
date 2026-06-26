import {
  DecisionInputSchema,
  DecisionSchema,
  type DecisionInput,
  type Decision,
} from "@alfy2/shared";
import { type DecisionClassifier, RuleClassifier } from "./classifier.js";
import { buildBlob } from "./signals.js";
import {
  scoreUrgency,
  scoreImportance,
  scoreDifficulty,
  estimateEffort,
  scoreRevenue,
  scoreRisk,
  requiredApprovals,
  recommendAgents,
  recommendDeadline,
  automationOpportunities,
  priority,
  DEFAULT_PRIORITY_WEIGHTS,
  type PriorityWeights,
} from "./scoring.js";

/**
 * The Decision Engine — Alfy2's triage cortex (docs/adr/ADR-0003-decision-engine.md).
 * Classifies any input (business/personal/health/finance/relationship/idea/learning/risk/opportunity)
 * and scores urgency, importance, difficulty, effort, revenue impact, and risk, then derives required
 * approvals, recommended agents, a deadline, and automation opportunities — returning a structured,
 * explainable Decision. Deterministic by default; the classifier is a swappable port so an AI
 * classifier (behind the gated AI Gateway) can replace it later without changing this engine.
 */

export interface DecisionEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
  classifier?: DecisionClassifier;
  priorityWeights?: PriorityWeights;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class DecisionEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly classifier: DecisionClassifier;
  private readonly weights: PriorityWeights;

  constructor(options: DecisionEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.classifier = options.classifier ?? new RuleClassifier();
    this.weights = options.priorityWeights ?? DEFAULT_PRIORITY_WEIGHTS;
  }

  /** Classify and score a single input into a structured Decision. */
  async decide(tenantId: string, input: DecisionInput): Promise<Decision> {
    const parsed = DecisionInputSchema.parse(input);
    const now = this.clock();
    const blob = buildBlob(parsed.text, parsed.context);

    const { categories, reasons: classReasons } = await this.classifier.classify(
      parsed.text,
      parsed.context,
    );
    const primary = categories[0]!.category;

    const urgency = scoreUrgency(blob, parsed.context, now);
    const importance = scoreImportance(blob, categories);
    const difficulty = scoreDifficulty(blob);
    const effort = estimateEffort(difficulty.value, blob);
    const revenue = scoreRevenue(blob, parsed.context);
    const risk = scoreRisk(blob, parsed.context);

    const approvals = requiredApprovals(blob, revenue.value, risk.value, parsed.context);
    const agents = recommendAgents(categories);
    const deadline = recommendDeadline(urgency.value, now);
    const automations = automationOpportunities(blob);
    const prio = priority(
      {
        urgency: urgency.value,
        importance: importance.value,
        revenue_impact: revenue.value,
        risk: risk.value,
      },
      this.weights,
    );

    const reasons = [
      ...classReasons,
      ...urgency.reasons,
      ...importance.reasons,
      ...difficulty.reasons,
      ...effort.reasons,
      ...revenue.reasons,
      ...risk.reasons,
      ...approvals.reasons,
    ];

    const others = categories
      .slice(1)
      .map((c) => c.category)
      .join(", ");
    const explanation =
      `Classified as ${primary}${others ? ` (also ${others})` : ""} and scored ${prio.level} ` +
      `(priority ${round2(prio.score)}). ` +
      `Urgency ${round2(urgency.value)}, importance ${round2(importance.value)}, ` +
      `revenue impact ${round2(revenue.value)}, risk ${round2(risk.value)}; ` +
      `~${effort.minutes} min (${effort.bucket}). ` +
      `Recommended deadline in ${deadline.days} day${deadline.days === 1 ? "" : "s"}. ` +
      (approvals.approvals.length
        ? "Requires operator approval before any irreversible step."
        : "No approval gate triggered.");

    const decision: Decision = {
      id: this.newId(),
      tenant_id: tenantId,
      input_text: parsed.text,
      source: parsed.source,
      categories,
      primary_category: primary,
      urgency: round2(urgency.value),
      importance: round2(importance.value),
      difficulty: round2(difficulty.value),
      revenue_impact: round2(revenue.value),
      risk: round2(risk.value),
      estimated_effort_minutes: effort.minutes,
      effort_bucket: effort.bucket,
      priority_score: round2(prio.score),
      priority_level: prio.level,
      required_approvals: approvals.approvals,
      recommended_agents: agents,
      recommended_deadline: deadline.iso,
      automation_opportunities: automations,
      reasons,
      explanation,
      created_at: now.toISOString(),
    };

    // Guarantee the output satisfies the contract before it leaves the engine.
    return DecisionSchema.parse(decision);
  }

  /** Classify and score many inputs. */
  async decideMany(tenantId: string, inputs: DecisionInput[]): Promise<Decision[]> {
    return Promise.all(inputs.map((input) => this.decide(tenantId, input)));
  }
}
