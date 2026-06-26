import {
  AddPhilosophyInputSchema,
  PhilosophySchema,
  TodaysReminderSchema,
  type AddPhilosophyInput,
  type Philosophy,
  type TodaysReminder,
} from "@alfy2/shared";

/**
 * Philosophy Library (docs/adr/ADR-0123-philosophy-library.md). Stores every principle, equation,
 * framework, mental model, operating philosophy, and insight that defines Alfy² — each with purpose,
 * explanation, diagram, examples, relations, and a revision count — and surfaces one as "Today's
 * Reminder" each day to reinforce long-term thinking. Mutable (revise / pin / unpin bump updated_at).
 * Today's Reminder is chosen deterministically by hashing the date over the tenant's philosophies.
 * Tenant-scoped.
 */

export class PhilosophyLibraryError extends Error {}

export class PhilosophyLibrary {
  private readonly store = new Map<string, Philosophy>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Add a philosophy. revision starts at 0; created_at/updated_at = now. */
  add(tenantId: string, input: AddPhilosophyInput): Philosophy {
    const i = AddPhilosophyInputSchema.parse(input);
    const now = this.clock().toISOString();
    const philosophy = PhilosophySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      name: i.name,
      purpose: i.purpose,
      explanation: i.explanation,
      visual_diagram: i.visual_diagram,
      examples: i.examples,
      related_algorithms: i.related_algorithms,
      related_agents: i.related_agents,
      businesses_using: i.businesses_using,
      core: i.core,
      revision: 0,
      created_at: now,
      updated_at: now,
    });
    this.store.set(philosophy.id, philosophy);
    return philosophy;
  }

  /** Apply a patch; bumps revision + 1 and updated_at. */
  revise(
    tenantId: string,
    id: string,
    patch: Partial<
      Omit<Philosophy, "id" | "tenant_id" | "revision" | "created_at" | "updated_at">
    >,
  ): Philosophy {
    const cur = this.require(tenantId, id);
    const next = PhilosophySchema.parse({
      ...cur,
      ...patch,
      id: cur.id,
      tenant_id: cur.tenant_id,
      revision: cur.revision + 1,
      created_at: cur.created_at,
      updated_at: this.clock().toISOString(),
    });
    this.store.set(next.id, next);
    return next;
  }

  /** Pin as a Core Philosophy; bumps updated_at. */
  pin(tenantId: string, id: string): Philosophy {
    return this.setCore(tenantId, id, true);
  }

  /** Unpin from Core Philosophies; bumps updated_at. */
  unpin(tenantId: string, id: string): Philosophy {
    return this.setCore(tenantId, id, false);
  }

  private setCore(tenantId: string, id: string, core: boolean): Philosophy {
    const cur = this.require(tenantId, id);
    const next = PhilosophySchema.parse({
      ...cur,
      core,
      updated_at: this.clock().toISOString(),
    });
    this.store.set(next.id, next);
    return next;
  }

  list(tenantId: string): Philosophy[] {
    return [...this.store.values()].filter((p) => p.tenant_id === tenantId);
  }

  get(tenantId: string, id: string): Philosophy | undefined {
    const p = this.store.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  /** The pinned Core Philosophies. */
  core(tenantId: string): Philosophy[] {
    return this.list(tenantId).filter((p) => p.core === true);
  }

  /**
   * Deterministically pick one philosophy for the given date (YYYY-MM-DD). Uses the day-of-epoch
   * modulo the count over the tenant's philosophies sorted by created_at then id. Throws when empty.
   */
  todaysReminder(tenantId: string, date: string): TodaysReminder {
    const ordered = this.list(tenantId).sort((a, b) => {
      if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    if (ordered.length === 0) {
      throw new PhilosophyLibraryError(
        `No philosophies in tenant ${tenantId}; cannot pick today's reminder.`,
      );
    }
    const ymd = date.slice(0, 10);
    const dayOfEpoch = Math.floor(Date.parse(`${ymd}T00:00:00.000Z`) / 86_400_000);
    const index = ((dayOfEpoch % ordered.length) + ordered.length) % ordered.length;
    const chosen = ordered[index];
    if (!chosen) {
      throw new PhilosophyLibraryError(
        `Could not resolve today's reminder for tenant ${tenantId}.`,
      );
    }
    return TodaysReminderSchema.parse({
      date: `${ymd}T00:00:00.000Z`,
      philosophy_id: chosen.id,
      name: chosen.name,
      purpose: chosen.purpose,
    });
  }

  private require(tenantId: string, id: string): Philosophy {
    const p = this.get(tenantId, id);
    if (!p) {
      throw new PhilosophyLibraryError(`No philosophy ${id} in tenant ${tenantId}.`);
    }
    return p;
  }
}
