import {
  BuildRhythmInputSchema,
  OperatingRhythmAgendaSchema,
  RhythmOutputsSchema,
  type BuildRhythmInput,
  type OperatingRhythmAgenda,
  type RhythmCadence,
} from "@alfy2/shared";

/**
 * Enterprise Operating Rhythm (docs/adr/ADR-0118-operating-rhythm.md). The company runs on a fixed cadence
 * — daily, weekly, monthly, quarterly, and annual reviews — and each review has a templated agenda and must
 * produce the same compounding outputs (lessons, decisions, assets, SOPs, new agents, archived workflows,
 * updated goals). `build()` returns the agenda for a cadence on a given date; it is a pure read-model and
 * does not persist. The agenda templates are a frozen catalog keyed by cadence.
 */

/** The templated agenda items for each cadence — the frozen catalog. */
export const RHYTHM_AGENDAS: Record<RhythmCadence, readonly string[]> = Object.freeze({
  daily: Object.freeze([
    "Executive Briefing",
    "Revenue Actions",
    "Approvals",
    "Calendar",
    "Daily Reflection",
  ]),
  weekly: Object.freeze([
    "Sales Review",
    "Pipeline",
    "Content",
    "AI Updates",
    "R&D",
    "Follow-ups",
    "Reflection",
  ]),
  monthly: Object.freeze([
    "Financial Review",
    "Goals",
    "Capital Allocation",
    "Automation Review",
    "Agent Performance",
  ]),
  quarterly: Object.freeze([
    "Enterprise",
    "Technology",
    "Competitive",
    "Portfolio",
    "Founder Review",
  ]),
  annual: Object.freeze([
    "Vision",
    "Capital Plan",
    "Hiring",
    "Architecture",
    "Major Initiatives",
  ]),
});

/** The five cadences, in order. */
const CADENCES: readonly RhythmCadence[] = Object.freeze([
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annual",
]);

export class EnterpriseOperatingRhythm {
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** All five cadences, in order. */
  cadences(): readonly RhythmCadence[] {
    return CADENCES;
  }

  /**
   * Build the agenda for a cadence on a given date. The agenda is the templated list for that cadence and
   * every review generates the full set of compounding outputs (all true). Pure — does not persist.
   */
  build(tenantId: string, input: BuildRhythmInput): OperatingRhythmAgenda {
    const i = BuildRhythmInputSchema.parse(input);

    const agenda = [...RHYTHM_AGENDAS[i.cadence]];
    const generates = RhythmOutputsSchema.parse({
      lessons: true,
      decisions: true,
      assets: true,
      sops: true,
      new_agents: true,
      archived_workflows: true,
      updated_goals: true,
    });

    return OperatingRhythmAgendaSchema.parse({
      cadence: i.cadence,
      date: i.date,
      agenda,
      generates,
    });
  }
}
