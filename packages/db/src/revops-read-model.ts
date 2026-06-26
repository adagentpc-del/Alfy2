import type {
  RevOpsReadModel,
  RevOpsAggregate,
  RevOpsOpportunity,
  RevOpsActionRow,
} from "@alfy2/core";
import type { Querier } from "./client.js";

interface OppRow {
  id: string;
  title: string;
  business: string;
  expected_revenue_usd: number;
  probability: number;
  score: number;
  speed_to_cash_days: number;
  status: string;
  updated_at: Date | string;
}

interface ActionRow {
  id: string;
  action: string;
  business: string;
  expected_revenue_usd: number;
  due: Date | string | null;
  status: string;
}

function iso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

/**
 * Postgres-backed {@link RevOpsReadModel}. Composes the RevOps aggregate from the live
 * `revenue_opportunities` and `revenue_money_actions` tables (RLS isolates via the connection's
 * `app.tenant_id` GUC; the optional `business` predicate narrows to one business when supplied).
 * Construct per unit of work from a tenant-scoped {@link Querier}. Read-only — no migration owns this
 * vertical.
 */
export class PgRevOpsReadModel implements RevOpsReadModel {
  constructor(private readonly q: Querier) {}

  async aggregate(_tenantId: string, business?: string): Promise<RevOpsAggregate> {
    const businessParam = business ?? null;

    const [opps, actions] = await Promise.all([
      this.q.query(
        `select id, title, coalesce(business,'') as business,
                coalesce(expected_revenue_usd,0) as expected_revenue_usd,
                least(greatest(coalesce(probability_of_close,0),0),1) as probability,
                coalesce(score,0) as score,
                coalesce(speed_to_cash_days,0) as speed_to_cash_days,
                status, updated_at
           from revenue_opportunities
          where ($1::text is null or business = $1)
          order by score desc nulls last
          limit 200`,
        [businessParam],
      ),
      this.q.query(
        `select id, action, coalesce(business,'') as business,
                coalesce(expected_revenue_usd,0) as expected_revenue_usd,
                due, status
           from revenue_money_actions
          where ($1::text is null or business = $1)
          limit 200`,
        [businessParam],
      ),
    ]);

    const opportunities: RevOpsOpportunity[] = (opps.rows as OppRow[]).map((r) => ({
      id: r.id,
      title: r.title,
      business: r.business,
      expected_revenue_usd: Number(r.expected_revenue_usd),
      probability: Number(r.probability),
      score: Number(r.score),
      speed_to_cash_days: Number(r.speed_to_cash_days),
      status: r.status,
      updated_at: iso(r.updated_at),
    }));

    const money_actions: RevOpsActionRow[] = (actions.rows as ActionRow[]).map((r) => ({
      id: r.id,
      action: r.action,
      business: r.business,
      expected_revenue_usd: Number(r.expected_revenue_usd),
      due: r.due === null ? null : iso(r.due),
      status: r.status,
    }));

    return {
      as_of: new Date().toISOString(),
      opportunities,
      money_actions,
    };
  }
}
