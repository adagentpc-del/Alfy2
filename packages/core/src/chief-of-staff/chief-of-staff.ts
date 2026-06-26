import {
  ChiefOfStaffBriefingSchema,
  type ChiefOfStaffBriefing,
  type BriefingItem,
  type BriefingHorizon,
  type CalendarBlock,
  type MeetingPrep,
  type Decision,
  type DecisionCategory,
  type PriorityLevel,
} from "@alfy2/shared";
import type { DecisionEngine } from "../decision/engine.js";
import type { BriefInput, MeetingInput, MemoryReader } from "./types.js";
import { renderDashboardMarkdown } from "./render.js";

/**
 * The Chief of Staff — Alfy2's executive layer (docs/adr/ADR-0004-chief-of-staff.md).
 * It triages inputs through the Decision Engine, reads context from memory (read-only `peek`), and
 * assembles a structured executive briefing: daily priorities, revenue focus, calendar/meeting prep,
 * follow-ups, risk alerts, blocked projects, personal reminders, energy plan, decision queue, and a
 * dashboard.
 *
 * INVARIANT: it never executes work. It holds no Dispatcher, no AI Gateway, and no memory WRITE
 * access — only a read-only `MemoryReader`. Everything it produces is a recommendation, a routing
 * hint, or a queue entry for the operator. It coordinates; it does not act.
 */

export interface ChiefOfStaffOptions {
  clock?: () => Date;
  idFactory?: () => string;
  /** Optional read-only memory access for context (meeting prep, blocked-project scan). */
  memory?: MemoryReader;
  /** How many items to surface per section. */
  sectionLimit?: number;
}

const FOLLOW_UP = /follow[\s-]?up/i;
const BLOCKED = /\b(blocked|block on|stuck|waiting on|on hold|stalled)\b/i;

function levelFromScore(score: number): PriorityLevel {
  return score >= 0.75 ? "critical" : score >= 0.5 ? "high" : score >= 0.25 ? "medium" : "low";
}

function shortTitle(text: string): string {
  const cleaned = text.replace(/^\s*(urgent|asap|fyi|reminder)\s*[:!-]?\s*/i, "").trim();
  const firstSentence = cleaned.split(/[.!?\n]/)[0]!.trim() || cleaned;
  return firstSentence.length > 90 ? `${firstSentence.slice(0, 87)}…` : firstSentence;
}

export class ChiefOfStaff {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly memory: MemoryReader | undefined;
  private readonly limit: number;

  constructor(
    private readonly decisions: DecisionEngine,
    options: ChiefOfStaffOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.memory = options.memory;
    this.limit = options.sectionLimit ?? 5;
  }

  /** Generate the executive briefing. Reads and synthesizes only — executes nothing. */
  async brief(tenantId: string, input: BriefInput): Promise<ChiefOfStaffBriefing> {
    const now = this.clock();
    const horizon: BriefingHorizon = input.horizon ?? "today";

    // 1. Triage every input into a scored Decision (classification, not execution).
    const decisions = await this.decisions.decideMany(tenantId, input.items);

    // 2. Synthesize sections.
    const daily_priorities = this.topBy(decisions, (d) => d.priority_score).map((d) =>
      this.item(d, d.priority_score),
    );

    const revenue_focus = this.topBy(
      decisions.filter((d) => d.revenue_impact >= 0.4),
      (d) => d.revenue_impact,
    ).map((d) => this.item(d, d.revenue_impact, `Revenue impact ${d.revenue_impact}.`));

    const risk_alerts = this.topBy(
      decisions.filter((d) => d.risk >= 0.5 || d.primary_category === "risk"),
      (d) => d.risk,
    ).map((d) => this.item(d, d.risk));

    const follow_ups = this.topBy(
      decisions.filter(
        (d) =>
          d.automation_opportunities.some((a) => FOLLOW_UP.test(a)) ||
          FOLLOW_UP.test(d.input_text) ||
          (["business", "relationship"].includes(d.primary_category) && d.priority_score >= 0.5),
      ),
      (d) => d.priority_score,
      8,
    ).map((d) => this.item(d, d.priority_score));

    const personal_reminders = this.topBy(
      decisions.filter((d) =>
        ["personal", "health", "relationship"].includes(d.primary_category),
      ),
      (d) => d.priority_score,
    ).map((d) => this.item(d, d.priority_score));

    const decision_queue = this.topBy(
      decisions.filter((d) => d.required_approvals.length > 0),
      (d) => d.priority_score,
      8,
    ).map((d) => this.item(d, d.priority_score));

    const blocked_projects = await this.blockedProjects(tenantId, decisions);
    const meeting_preparation = await this.meetingPrep(tenantId, input.meetings ?? []);
    const calendar_preparation = this.calendarBlocks(input.meetings ?? [], daily_priorities);
    const energy_optimization = this.energyPlan(decisions);

    // 3. Dashboard.
    const levels = countLevels(decisions);
    const top_focus = daily_priorities[0]?.title ?? "Nothing urgent on deck";
    const markdown = renderDashboardMarkdown({
      horizon,
      daily_priorities,
      revenue_focus,
      calendar_preparation,
      meeting_preparation,
      follow_ups,
      risk_alerts,
      blocked_projects,
      personal_reminders,
      energy_optimization,
      decision_queue,
    });
    const dashboard = {
      total_items: decisions.length,
      critical_count: levels.critical,
      high_count: levels.high,
      medium_count: levels.medium,
      low_count: levels.low,
      revenue_opportunities: revenue_focus.length,
      open_risks: risk_alerts.length,
      blocked_count: blocked_projects.length,
      decisions_awaiting: decision_queue.length,
      top_focus,
      markdown,
    };

    const notes: string[] = [];
    if (decision_queue.length) notes.push(`${decision_queue.length} item(s) need your decision`);
    if (risk_alerts.length) notes.push(`${risk_alerts.length} open risk(s)`);
    notes.push("Chief of Staff coordinates only — no work was executed");

    const explanation =
      decisions.length === 0
        ? "Nothing to triage right now. Inbox is clear."
        : `${horizon === "today" ? "Today" : "This week"} centers on "${top_focus}". ` +
          `${decision_queue.length} decision(s) await you, ${risk_alerts.length} risk(s) and ` +
          `${blocked_projects.length} blocked item(s) need attention. Front-load deep work at peak energy.`;

    const briefing: ChiefOfStaffBriefing = {
      id: this.newId(),
      tenant_id: tenantId,
      generated_at: now.toISOString(),
      horizon,
      daily_priorities,
      revenue_focus,
      calendar_preparation,
      meeting_preparation,
      follow_ups,
      risk_alerts,
      blocked_projects,
      personal_reminders,
      energy_optimization,
      decision_queue,
      // The morning headline: at most three decisions only Alyssa can make today.
      three_decisions_only_you_can_make: decision_queue.slice(0, 3),
      dashboard,
      explanation,
      notes,
    };

    // Guarantee the output satisfies the contract before it leaves the executive layer.
    return ChiefOfStaffBriefingSchema.parse(briefing);
  }

  // --- section builders ---------------------------------------------------

  private topBy(
    decisions: Decision[],
    score: (d: Decision) => number,
    limit = this.limit,
  ): Decision[] {
    return [...decisions].sort((a, b) => score(b) - score(a)).slice(0, limit);
  }

  private item(d: Decision, score: number, detailOverride?: string): BriefingItem {
    return {
      title: shortTitle(d.input_text),
      detail: detailOverride ?? d.explanation,
      priority_level: d.priority_level,
      score: Math.min(1, Math.max(0, score)),
      category: d.primary_category,
      ref: d.id,
      due: d.recommended_deadline,
      required_approvals: d.required_approvals,
      recommended_agents: d.recommended_agents,
    };
  }

  private async blockedProjects(tenantId: string, decisions: Decision[]): Promise<BriefingItem[]> {
    const fromDecisions = decisions
      .filter((d) => BLOCKED.test(d.input_text))
      .map((d) => this.item(d, d.priority_score));

    const fromMemory: BriefingItem[] = [];
    if (this.memory) {
      const hits = await this.memory.peek(tenantId, {
        text: "blocked stuck waiting",
        keywords: ["blocked"],
        kinds: ["project"],
        min_importance: 0,
        min_confidence: 0,
        limit: 5,
        include_archived: false,
      });
      for (const { memory } of hits) {
        const blob = `${memory.title} ${memory.body} ${memory.keywords.join(" ")}`;
        if (!BLOCKED.test(blob)) continue;
        fromMemory.push({
          title: memory.title,
          detail: memory.body,
          priority_level: levelFromScore(memory.importance),
          score: memory.importance,
          category: null,
          ref: memory.id,
          due: null,
          required_approvals: [],
          recommended_agents: [],
        });
      }
    }
    return [...fromDecisions, ...fromMemory].slice(0, this.limit);
  }

  private async meetingPrep(tenantId: string, meetings: MeetingInput[]): Promise<MeetingPrep[]> {
    const out: MeetingPrep[] = [];
    for (const m of meetings) {
      const attendees = m.attendees ?? [];
      const related_memory_ids: string[] = [];
      if (this.memory && (attendees.length || m.title)) {
        const hits = await this.memory.peek(tenantId, {
          text: `${m.title} ${attendees.join(" ")}`.trim(),
          keywords: attendees,
          kinds: ["person", "company", "meeting"],
          min_importance: 0,
          min_confidence: 0,
          limit: 5,
          include_archived: false,
        });
        for (const { memory } of hits) related_memory_ids.push(memory.id);
      }
      const prep_points = [
        "Confirm the single objective and the one ask",
        ...attendees.map((a) => `Review context on ${a}`),
        "Decide the next step before the meeting ends",
      ];
      out.push({
        title: m.title,
        when: m.when ?? null,
        attendees,
        related_memory_ids,
        prep_points,
        recommended_agents: ["research.web", "draft.text"],
      });
    }
    return out;
  }

  private calendarBlocks(meetings: MeetingInput[], priorities: BriefingItem[]): CalendarBlock[] {
    const blocks: CalendarBlock[] = [];
    const topDeep = priorities[0];
    blocks.push({
      label: "Deep-work block",
      when: null,
      recommendation: topDeep
        ? `Protect ~90 minutes at peak energy for: ${topDeep.title}.`
        : "Protect a focused block for your most important work.",
    });
    for (const m of meetings) {
      const pre =
        m.when != null ? new Date(new Date(m.when).getTime() - 15 * 60_000).toISOString() : null;
      blocks.push({
        label: `Pre-meeting prep — ${m.title}`,
        when: pre,
        recommendation: `15-minute review before ${m.title}.`,
      });
    }
    blocks.push({
      label: "Triage block",
      when: null,
      recommendation: "Batch quick replies and admin into a single short block.",
    });
    return blocks;
  }

  private energyPlan(decisions: Decision[]) {
    const deep_work = [...decisions]
      .filter((d) => d.difficulty >= 0.5)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map((d) => this.item(d, d.importance, "High difficulty — schedule at peak energy."));

    const quick_wins = [...decisions]
      .filter((d) => d.effort_bucket === "trivial" || d.effort_bucket === "small")
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 5)
      .map((d) => this.item(d, d.priority_score, "Low effort — batch when energy dips."));

    return {
      summary:
        "Front-load deep work at peak energy, batch quick wins during the afternoon dip, and protect recovery.",
      deep_work,
      quick_wins,
      recovery: [
        "Take short breaks between deep-work blocks",
        "Step away from screens at midday",
        "Set a hard stop in the evening",
      ],
    };
  }
}

function countLevels(decisions: Decision[]): Record<PriorityLevel, number> {
  const counts: Record<PriorityLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const d of decisions) counts[d.priority_level]++;
  return counts;
}

// Re-export so consumers can reference category typing without reaching into shared.
export type { DecisionCategory };
