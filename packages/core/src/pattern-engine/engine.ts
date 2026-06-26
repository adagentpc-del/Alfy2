import {
  BehaviorObservationSchema,
  PatternReportSchema,
  type BehaviorObservation,
  type Pattern,
  type Bottleneck,
  type AutomationRec,
  type PatternAgentRec,
  type WorkflowRec,
  type PatternReport,
  type BehaviorSignal,
} from "@alfy2/shared";
import {
  timeOfDayPattern,
  stressPattern,
  avoidancePatterns,
  outcomePattern,
  bottlenecksFrom,
} from "./analyzers.js";
import {
  detectStrengths,
  detectRepeatingMistakes,
  detectSuccessfulHabits,
  scheduleRecommendations,
} from "./insights.js";

/**
 * The Pattern Engine — Alfy2's self-awareness layer (docs/adr/ADR-0009-pattern-engine.md).
 * It observes a window of behavioral observations, detects patterns, finds bottlenecks, and
 * recommends automations, new agents, and workflow improvements.
 *
 * TWO INVARIANTS, enforced by construction:
 *  1. ADVISORY ONLY — it holds no write/dispatch ports and changes nothing. Every report is marked
 *     `advisory_only: true`. It recommends; it never modifies behavior.
 *  2. ALWAYS EXPLAIN — every pattern, bottleneck, and recommendation carries a non-empty explanation
 *     (enforced by the contract; populated here from the evidence).
 */

export interface PatternEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

const HABIT_SIGNALS: BehaviorSignal[] = ["follow_up", "sales", "launch", "meeting", "decision"];

export class PatternEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: PatternEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Analyze observations into an explained, advisory-only PatternReport. Changes nothing. */
  analyze(tenantId: string, rawObservations: BehaviorObservation[]): PatternReport {
    const observations = rawObservations.map((o) => BehaviorObservationSchema.parse(o));
    const now = this.clock();

    // --- patterns ---
    const patterns: Pattern[] = [];
    const perf = timeOfDayPattern(observations, "performance");
    if (perf) patterns.push(perf);
    const energy = timeOfDayPattern(observations, "energy");
    if (energy) patterns.push(energy);
    const stress = stressPattern(observations);
    if (stress) patterns.push(stress);
    for (const signal of HABIT_SIGNALS) {
      const r = outcomePattern(observations, signal);
      if (r) patterns.push(r.pattern);
    }
    patterns.push(...avoidancePatterns(observations));

    // --- bottlenecks ---
    const { bottlenecks } = bottlenecksFrom(observations);

    // --- recommendations (each explained) ---
    const automations = new Map<string, AutomationRec>();
    const agents = new Map<string, PatternAgentRec>();
    const workflows = new Map<string, WorkflowRec>();

    for (const b of bottlenecks) this.recommendForBottleneck(b, automations, agents, workflows);

    // A positive performance pattern is a workflow lever, not a bottleneck.
    if (perf && perf.direction === "positive") {
      const best = perf.summary.match(/in the (\w+)/)?.[1] ?? "morning";
      workflows.set("Protect your peak hours", {
        title: "Protect your peak hours",
        change: `Block your ${best} for the hardest task; move admin and low-stakes calls out of that window.`,
        explanation: perf.detail,
        addresses: "Performance",
      });
    }
    if (stress && stress.direction === "negative") {
      workflows.set("Avoid hard work under stress", {
        title: "Avoid hard work under stress",
        change: "Add recovery blocks and avoid irreversible decisions during your high-stress window.",
        explanation: stress.detail,
        addresses: "Stress",
      });
    }

    const report: PatternReport = {
      id: this.newId(),
      tenant_id: tenantId,
      generated_at: now.toISOString(),
      window: this.windowOf(observations),
      patterns,
      bottlenecks,
      strengths: detectStrengths(observations),
      repeating_mistakes: detectRepeatingMistakes(observations),
      successful_habits: detectSuccessfulHabits(observations),
      recommended_automations: [...automations.values()],
      recommended_agents: [...agents.values()],
      workflow_improvements: [...workflows.values()],
      schedule_recommendations: scheduleRecommendations(observations),
      summary: this.summarize(patterns, bottlenecks),
      advisory_only: true,
    };

    return PatternReportSchema.parse(report);
  }

  private recommendForBottleneck(
    b: Bottleneck,
    automations: Map<string, AutomationRec>,
    agents: Map<string, PatternAgentRec>,
    workflows: Map<string, WorkflowRec>,
  ): void {
    const ev = `(${b.evidence_count} observations)`;
    if (b.area === "Follow-ups") {
      automations.set("Auto follow-up reminders", {
        title: "Auto follow-up reminders",
        what: "Automatically schedule 24h/3d/7d nudges until a reply lands.",
        explanation: `Follow-ups go off-track ${ev}; an automatic cadence removes the manual step that keeps getting dropped.`,
        addresses: b.area,
      });
      agents.set("business.followup", {
        proposed_key: "business.followup",
        purpose: "Draft and track follow-ups so threads never go cold",
        capabilities: ["draft_followup", "track_status"],
        explanation: `The late-follow-up pattern is consistent enough ${ev} to justify a dedicated agent that prepares the follow-up for your approval.`,
        addresses: b.area,
      });
      workflows.set("Batch follow-ups", {
        title: "Batch follow-ups",
        change: "Do all follow-ups in one short morning block instead of ad hoc.",
        explanation: `Batching beats willpower — it fixes the recurring slip ${ev} without relying on remembering.`,
        addresses: b.area,
      });
    } else if (b.area === "Sales outreach" || b.area === "Sales activities") {
      automations.set("Auto-draft outreach", {
        title: "Auto-draft outreach",
        what: "Pre-draft outreach messages for your approval each morning.",
        explanation: `Outreach is repeatedly avoided ${ev}; lowering the activation cost (a ready draft) is the highest-leverage fix.`,
        addresses: b.area,
      });
      agents.set("sales.outreach", {
        proposed_key: "sales.outreach",
        purpose: "Draft personalized outreach and track replies",
        capabilities: ["draft_outreach", "track_replies"],
        explanation: `Avoidance here is stable ${ev} — a dedicated outreach agent removes the part you keep skipping.`,
        addresses: b.area,
      });
      workflows.set("Daily outreach block", {
        title: "Daily outreach block",
        change: "A fixed 15-minute daily outreach block with templates.",
        explanation: `Small, time-boxed, templated — designed to defeat the avoidance pattern ${ev}.`,
        addresses: b.area,
      });
    } else if (b.area === "Meetings") {
      automations.set("Auto-prepare meeting briefs", {
        title: "Auto-prepare meeting briefs",
        what: "Auto-generate a brief (via the Chief of Staff) before each meeting.",
        explanation: `Meetings run off-track ${ev}; walking in prepared tightens them.`,
        addresses: b.area,
      });
      workflows.set("Default shorter meetings", {
        title: "Default shorter meetings",
        change: "Default to 25-minute meetings with a required agenda.",
        explanation: `Structural defaults beat discipline for the overrun pattern ${ev}.`,
        addresses: b.area,
      });
    } else if (b.area === "Decisions") {
      workflows.set("Cool-down on big decisions", {
        title: "Cool-down on big decisions",
        change: "Add a 24h cool-down before any irreversible decision.",
        explanation: `Reversed/delayed decisions ${ev} point to deciding too fast under pressure — a cool-down reduces rework.`,
        addresses: b.area,
      });
    } else if (b.area === "Launches") {
      workflows.set("Launch checklist", {
        title: "Launch checklist",
        change: "Use a standard launch checklist and pre-schedule assets.",
        explanation: `Launches slip ${ev}; a checklist removes the dropped steps.`,
        addresses: b.area,
      });
    } else if (b.area.startsWith("Avoidance:")) {
      const what = b.area.replace(/^Avoidance:\s*/, "");
      workflows.set(`Time-box ${what}`, {
        title: `Time-box ${what}`,
        change: `Put ${what} into a small, fixed daily block to lower the activation cost.`,
        explanation: `${what} is consistently avoided ${ev}; shrinking and scheduling it is the reliable fix.`,
        addresses: b.area,
      });
    }
  }

  private windowOf(obs: BehaviorObservation[]): PatternReport["window"] {
    if (obs.length === 0) return { from: null, to: null, observation_count: 0 };
    const times = obs.map((o) => o.at).sort();
    return { from: times[0]!, to: times[times.length - 1]!, observation_count: obs.length };
  }

  private summarize(patterns: Pattern[], bottlenecks: Bottleneck[]): string {
    if (patterns.length === 0) {
      return "Not enough signal yet to detect patterns. Recommendations only — nothing was changed.";
    }
    const top = patterns[0]!;
    const lever = bottlenecks[0];
    return (
      `Top pattern: ${top.summary} ` +
      (lever ? `Biggest lever: address "${lever.area}" (${lever.severity}). ` : "") +
      `These are recommendations only — the Pattern Engine never changes your behavior automatically.`
    );
  }
}
