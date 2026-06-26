import {
  AddTimelineEventInputSchema,
  TimelineEventSchema,
  type AddTimelineEventInput,
  type TimelineEvent,
  type TimelineEventKind,
} from "@alfy2/shared";

/**
 * The Enterprise Memory Timeline (docs/adr/ADR-0091-memory-timeline.md). A chronological history of
 * business launches, campaigns, product releases, major decisions, clients, partnerships, financial
 * milestones, failures, wins, hiring, technology adoption, legal events, and media appearances — each event
 * linking related assets, agents, people, businesses, and lessons. It makes it easy to answer "when did we
 * first discuss this?" and "what happened after that decision?". Append-only — events are never edited or
 * deleted, only added. Deterministic. Tenant-scoped.
 */

export class EnterpriseMemoryTimeline {
  private readonly events: TimelineEvent[] = [];
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Append a timeline event. */
  add(tenantId: string, input: AddTimelineEventInput): TimelineEvent {
    const i = AddTimelineEventInputSchema.parse(input);
    const event = TimelineEventSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      title: i.title,
      occurred_at: i.occurred_at,
      summary: i.summary,
      business_id: i.business_id ?? null,
      related_assets: i.related_assets,
      related_agents: i.related_agents,
      related_people: i.related_people,
      related_businesses: i.related_businesses,
      lessons_learned: i.lessons_learned,
      created_at: this.clock().toISOString(),
    });
    this.events.push(event);
    return event;
  }

  /** All events for the tenant, sorted by occurrence time ascending. */
  chronological(tenantId: string): TimelineEvent[] {
    return this.list(tenantId).sort(
      (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
    );
  }

  /** "When did we first discuss this?" — earliest event whose title or summary contains the term. */
  firstMention(tenantId: string, term: string): TimelineEvent | undefined {
    const t = term.toLowerCase();
    return this.chronological(tenantId).find((e) =>
      `${e.title} ${e.summary}`.toLowerCase().includes(t),
    );
  }

  /** "What happened after that decision?" — events occurring strictly after the given event. */
  after(tenantId: string, eventId: string): TimelineEvent[] {
    const anchor = this.events.find((e) => e.id === eventId && e.tenant_id === tenantId);
    if (!anchor) return [];
    const anchorTime = new Date(anchor.occurred_at).getTime();
    return this.chronological(tenantId).filter(
      (e) => new Date(e.occurred_at).getTime() > anchorTime,
    );
  }

  byKind(tenantId: string, kind: TimelineEventKind): TimelineEvent[] {
    return this.list(tenantId).filter((e) => e.kind === kind);
  }

  list(tenantId: string): TimelineEvent[] {
    return this.events.filter((e) => e.tenant_id === tenantId);
  }
}
