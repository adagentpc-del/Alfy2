/**
 * RevOps read-model PORT (Release 6). The engine reads the revenue world through this single interface so
 * it stays infrastructure-free. The production adapter (Pg, over `revenue_opportunities` +
 * `revenue_money_actions`) is built in `@alfy2/db`; an in-memory fixture-backed reference implementation
 * ships here for tests and the smoke.
 *
 * The {@link RevOpsAggregate} is the plain, already-summarized shape the engine consumes — NOT the
 * contract snapshot. The engine derives the brief and the fastest-path plan from it.
 */

/** A revenue opportunity as the engine sees it (already coalesced — no nulls). */
export interface RevOpsOpportunity {
  id: string;
  title: string;
  business: string;
  expected_revenue_usd: number;
  probability: number;
  score: number;
  speed_to_cash_days: number;
  status: string;
  updated_at: string;
}

/** A money action row as the engine sees it (`due` may be null). */
export interface RevOpsActionRow {
  id: string;
  action: string;
  business: string;
  expected_revenue_usd: number;
  due: string | null;
  status: string;
}

/** The aggregate the read-model returns and the engine composes from. */
export interface RevOpsAggregate {
  as_of: string;
  opportunities: RevOpsOpportunity[];
  money_actions: RevOpsActionRow[];
}

/** The PORT the engine reads through. The concrete Pg implementation is built in `@alfy2/db`. */
export interface RevOpsReadModel {
  aggregate(tenantId: string, business?: string): Promise<RevOpsAggregate>;
}

/**
 * Reference {@link RevOpsReadModel} that returns a fixture passed to its constructor. For tests and the
 * smoke only — the production store is the Pg read-model adapter.
 */
export class InMemoryRevOpsReadModel implements RevOpsReadModel {
  constructor(private fixture: RevOpsAggregate) {}

  async aggregate(_tenantId: string, _business?: string): Promise<RevOpsAggregate> {
    return structuredClone(this.fixture);
  }
}
