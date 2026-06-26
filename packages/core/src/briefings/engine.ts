import {
  BriefingInputSchema,
  BriefingSchema,
  type BriefingInput,
  type Briefing,
  type BriefingKind,
} from "@alfy2/shared";

/**
 * The Briefing Engine (docs/adr/ADR-0070-briefing-engine.md). Assembles the four executive briefings —
 * morning, lunch, evening, weekly — from already-summarized inputs. The evening briefing closes the day
 * with the seven reflection questions and persists important reflections to Institutional Memory via the
 * configured memory sink. Deterministic and tenant-scoped: assembled briefings are stored per tenant.
 */

const GREETINGS: Record<BriefingKind, string> = {
  morning: "Good morning Alyssa.",
  lunch: "Your midday briefing, Alyssa.",
  evening: "Evening debrief, Alyssa.",
  weekly: "Your weekly intelligence report, Alyssa.",
};

const EVENING_QUESTIONS: string[] = [
  "What got completed?",
  "What made money?",
  "What did not move?",
  "What needs follow-up?",
  "What should be delegated tomorrow?",
  "What should be automated?",
  "What did Alyssa learn today?",
];

export class BriefingEngine {
  private readonly briefings = new Map<string, Briefing>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly memorySink: (tenantId: string, reflection: string) => void;

  constructor(
    options: {
      clock?: () => Date;
      idFactory?: () => string;
      memorySink?: (tenantId: string, reflection: string) => void;
    } = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.memorySink = options.memorySink ?? (() => {});
  }

  /** Assemble a briefing from labeled section inputs. Persists evening reflections to memory. */
  assemble(tenantId: string, input: BriefingInput): Briefing {
    const i = BriefingInputSchema.parse(input);

    const sections = Object.entries(i.sections).map(([key, items]) => ({
      heading: prettify(key),
      items,
    }));

    const isEvening = i.kind === "evening";
    const questions = isEvening ? EVENING_QUESTIONS : [];

    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
    const readingMinutes = this.estimateReadingMinutes(i.kind, totalItems);

    if (isEvening) {
      for (const reflection of i.reflections) this.memorySink(tenantId, reflection);
    }
    const savedReflectionCount = isEvening ? i.reflections.length : 0;

    const briefing = BriefingSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      date_label: i.date_label,
      greeting: GREETINGS[i.kind],
      sections,
      questions,
      estimated_reading_minutes: readingMinutes,
      saved_reflection_count: savedReflectionCount,
      created_at: this.clock().toISOString(),
    });

    this.briefings.set(briefing.id, briefing);
    return briefing;
  }

  private estimateReadingMinutes(kind: BriefingKind, totalItems: number): number {
    switch (kind) {
      case "morning":
        return 5;
      case "lunch":
        return 4;
      case "evening":
        return 3;
      case "weekly":
        return Math.round(clamp(totalItems * 0.3, 5, 20));
    }
  }

  list(tenantId: string): Briefing[] {
    return [...this.briefings.values()].filter((b) => b.tenant_id === tenantId);
  }

  get(tenantId: string, id: string): Briefing | null {
    const b = this.briefings.get(id);
    return b && b.tenant_id === tenantId ? b : null;
  }
}

/** snake_case → Title Case, e.g. "revenue_opportunities" → "Revenue Opportunities". */
const prettify = (key: string): string =>
  key
    .split(/[_\s]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
