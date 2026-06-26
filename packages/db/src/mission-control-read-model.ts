import type {
  MissionControlReadModel,
  MissionControlAggregate,
  MissionControlPendingApproval,
} from "@alfy2/core";
import type { Querier } from "./client.js";

interface CountRow {
  c: number;
}
interface ApprovalRow {
  id: string;
  action_class: string;
  risk: string;
  summary: string;
  requires_approval: boolean;
  created_at: Date | string;
}
interface BlockedRow {
  id: string;
  label: string | null;
}
interface OppRow {
  title: string;
  expected_revenue_usd: number | null;
  status: string;
}
interface FollowRow {
  id: string;
  entity_name: string;
  next_touch_at: Date | string | null;
}
interface CapacityRow {
  capacity_score: number | null;
  recommended_mode: string;
}

function iso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

/**
 * Postgres-backed {@link MissionControlReadModel}. Composes the Layer 0 aggregate from live tables
 * with a handful of small tenant-scoped queries (RLS isolates via the connection's `app.tenant_id`
 * GUC; the explicit predicates are defense-in-depth). Construct per unit of work from a tenant-scoped
 * {@link Querier}.
 *
 * v1 reads what is already persisted and true: the pending approval queue, open inbox loops, blocked
 * (high-urgency) items, top scored revenue opportunities, and due follow-ups. Revenue-today, cash, and
 * runway have no single source of truth yet — they are returned as 0 / null (not fabricated) and get
 * wired when the RevOps and Capital Allocation persistence land (Release 6). Department health and
 * founder capacity likewise default until their engines persist (Releases 5–6).
 */
export class PgMissionControlReadModel implements MissionControlReadModel {
  constructor(private readonly q: Querier) {}

  async aggregate(_tenantId: string, _businessId?: string): Promise<MissionControlAggregate> {
    const [approvals, openInbox, blocked, opps, follows, capacity] = await Promise.all([
      this.q.query(
        `select id, action_class, risk, summary, requires_approval, created_at
           from api_approval_requests where status = 'pending'
           order by created_at asc limit 50`,
      ),
      this.q.query(
        `select count(*)::int as c from inbox_items where status in ('new','reviewed')`,
      ),
      this.q.query(
        `select id, coalesce(nullif(next_action, ''), left(content, 80)) as label
           from inbox_items
          where status = 'new' and urgency_level in ('high','critical')
          order by urgency desc limit 20`,
      ),
      this.q.query(
        `select title, expected_revenue_usd, status from revenue_opportunities
          where status not in ('closed_won','closed_lost','dead')
          order by score desc nulls last limit 5`,
      ),
      this.q.query(
        `select id, entity_name, next_touch_at from follow_ups
          where status = 'active' and next_touch_at is not null and next_touch_at <= now()
          order by next_touch_at asc limit 20`,
      ),
      this.q.query(
        `select capacity_score, recommended_mode from founder_capacity_snapshots
          order by as_of desc limit 1`,
      ),
    ]);

    const cap = (capacity.rows as CapacityRow[])[0];

    const pending_approvals: MissionControlPendingApproval[] = (approvals.rows as ApprovalRow[]).map(
      (r) => ({
        id: r.id,
        action_class: r.action_class,
        risk: r.risk,
        summary: r.summary,
        requires_approval: r.requires_approval,
        created_at: iso(r.created_at),
      }),
    );

    return {
      as_of: new Date().toISOString(),
      revenue_today: 0,
      cash_position: 0,
      cash_runway_days: null,
      pending_approvals,
      open_inbox_count: (openInbox.rows as CountRow[])[0]?.c ?? 0,
      blocked: (blocked.rows as BlockedRow[]).map((r) => ({ id: r.id, label: r.label ?? "" })),
      opportunities: (opps.rows as OppRow[]).map((r) => ({
        label: r.title,
        value: r.expected_revenue_usd ?? 0,
        status: r.status,
      })),
      active_builds: [],
      department_health: {},
      founder_capacity: cap
        ? { score: cap.capacity_score, mode: cap.recommended_mode }
        : { score: null, mode: "normal" },
      follow_ups_due: (follows.rows as FollowRow[]).map((r) => ({
        id: r.id,
        label: r.entity_name,
        due: r.next_touch_at ? iso(r.next_touch_at) : "",
      })),
      meetings: [],
      launch_readiness: {},
    };
  }
}
