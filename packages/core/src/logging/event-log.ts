/**
 * Append-only Event Log + Decision Log (see ARCHITECTURE.md §3.5).
 * Core defines the PORTS only; concrete persistence (Supabase) is injected in Phase 2 so the
 * kernel stays infrastructure-free. A no-op/in-memory implementation is provided for tests.
 */

export interface EventRecord {
  tenant_id: string;
  trace_id: string;
  event_type: string;
  payload?: Record<string, unknown>;
}

export interface DecisionRecord {
  tenant_id: string;
  trace_id: string;
  event_id?: string;
  rationale: string;
  plan?: Record<string, unknown>;
}

/** Write-only ports. These never expose UPDATE/DELETE — the logs are append-only by contract. */
export interface EventLog {
  append(event: EventRecord): Promise<{ id: string }>;
}

export interface DecisionLog {
  append(decision: DecisionRecord): Promise<{ id: string }>;
}

/** In-memory reference implementation for tests and the Phase-0 check. Not for production. */
export class InMemoryEventLog implements EventLog {
  readonly records: Array<EventRecord & { id: string }> = [];
  async append(event: EventRecord): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    this.records.push({ ...event, id });
    return { id };
  }
}

export class InMemoryDecisionLog implements DecisionLog {
  readonly records: Array<DecisionRecord & { id: string }> = [];
  async append(decision: DecisionRecord): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    this.records.push({ ...decision, id });
    return { id };
  }
}
