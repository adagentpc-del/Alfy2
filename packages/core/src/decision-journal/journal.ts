import {
  RecordDecisionInputSchema,
  ReviewDecisionInputSchema,
  JournaledDecisionSchema,
  type RecordDecisionInput,
  type ReviewDecisionInput,
  type JournaledDecision,
  type JournalReviewWindow,
} from "@alfy2/shared";

/**
 * The Executive Decision Journal (docs/adr/ADR-0090-decision-journal.md). Records every major decision —
 * the decision, alternatives, reasoning, data available, assumptions, risks, and expected outcome — then
 * schedules reviews at 30, 90, and 365 days. At review time it captures the actual outcome and lessons
 * learned, which improves future recommendations and surfaces recurring decision patterns (categories with
 * two or more decisions). Deterministic. Tenant-scoped.
 */

const WINDOW_DAYS: Record<JournalReviewWindow, number> = {
  "30_day": 30,
  "90_day": 90,
  "1_year": 365,
};

export class ExecutiveDecisionJournal {
  private readonly decisions = new Map<string, JournaledDecision>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Record a decision and schedule its 30/90/365-day reviews. */
  record(tenantId: string, input: RecordDecisionInput): JournaledDecision {
    const i = RecordDecisionInputSchema.parse(input);
    const now = this.clock();
    const nowIso = now.toISOString();

    const reviews_due: Record<string, string> = {};
    for (const [window, days] of Object.entries(WINDOW_DAYS)) {
      reviews_due[window] = addDays(now, days).toISOString();
    }

    const decision = JournaledDecisionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      decision: i.decision,
      alternatives: i.alternatives,
      reasoning: i.reasoning,
      data_available: i.data_available,
      assumptions: i.assumptions,
      risks: i.risks,
      expected_outcome: i.expected_outcome,
      category: i.category,
      business_id: i.business_id ?? null,
      actual_outcome: "",
      lessons_learned: [],
      reviews_due,
      reviewed_windows: [],
      decided_at: nowIso,
      updated_at: nowIso,
    });
    this.decisions.set(decision.id, decision);
    return decision;
  }

  /** Record the outcome of a scheduled review window. */
  review(tenantId: string, id: string, input: ReviewDecisionInput): JournaledDecision | undefined {
    const existing = this.decisions.get(id);
    if (!existing || existing.tenant_id !== tenantId) return undefined;
    const r = ReviewDecisionInputSchema.parse(input);

    const reviewed_windows = existing.reviewed_windows.includes(r.window)
      ? existing.reviewed_windows
      : [...existing.reviewed_windows, r.window];

    const updated = JournaledDecisionSchema.parse({
      ...existing,
      actual_outcome: r.actual_outcome,
      lessons_learned: [...existing.lessons_learned, ...r.lessons_learned],
      reviewed_windows,
      updated_at: this.clock().toISOString(),
    });
    this.decisions.set(updated.id, updated);
    return updated;
  }

  /** Decisions with a review whose due-date has passed and whose window has not yet been reviewed. */
  dueForReview(tenantId: string, now?: Date): JournaledDecision[] {
    const at = (now ?? this.clock()).getTime();
    return this.list(tenantId).filter((d) =>
      Object.entries(d.reviews_due).some(
        ([window, due]) =>
          new Date(due).getTime() <= at &&
          !d.reviewed_windows.includes(window as JournalReviewWindow),
      ),
    );
  }

  /** Recurring decision patterns: categories with two or more decisions. */
  patterns(tenantId: string): { category: string; count: number; decision_ids: string[] }[] {
    const groups = new Map<string, JournaledDecision[]>();
    for (const d of this.list(tenantId)) {
      if (d.category.trim() === "") continue;
      const bucket = groups.get(d.category) ?? [];
      bucket.push(d);
      groups.set(d.category, bucket);
    }
    return [...groups.entries()]
      .filter(([, ds]) => ds.length >= 2)
      .map(([category, ds]) => ({ category, count: ds.length, decision_ids: ds.map((d) => d.id) }));
  }

  get(tenantId: string, id: string): JournaledDecision | undefined {
    const d = this.decisions.get(id);
    return d && d.tenant_id === tenantId ? d : undefined;
  }

  list(tenantId: string): JournaledDecision[] {
    return [...this.decisions.values()].filter((d) => d.tenant_id === tenantId);
  }
}

const addDays = (d: Date, days: number): Date => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
