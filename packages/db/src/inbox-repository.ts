import type {
  ProcessedInboxItem,
  InboxItemType,
  InboxCategory,
  LinkedEntity,
  SuggestedTask,
  FieldRequest,
} from "@alfy2/shared";
import type {
  InboxRepository,
  StoredInboxItem,
  InboxListFilter,
  InboxItemStatus,
} from "@alfy2/core";
import type { Querier } from "./client.js";

// Core columns of `inbox_items` (the generated `search_tsv` and `updated_at` are not read back).
const INBOX_COLS =
  "id, tenant_id, source, item_type, category, confidence, suggested_business, suggested_owner, " +
  "urgency, urgency_level, next_action, saved_memory_id, requires_approval, dashboard_updated, " +
  "content, payload, status, created_at";

type UrgencyLevel = ProcessedInboxItem["urgency_level"];

interface InboxRow {
  id: string;
  tenant_id: string;
  source: string;
  item_type: string;
  category: string;
  confidence: number;
  suggested_business: string | null;
  suggested_owner: string;
  urgency: number;
  urgency_level: string;
  next_action: string;
  saved_memory_id: string | null;
  requires_approval: boolean;
  dashboard_updated: boolean;
  content: string;
  payload: unknown;
  status: string;
  created_at: Date | string;
}

// Variable-shape fields of the processed item kept in the row's `payload` jsonb.
interface InboxPayload {
  linked_entities?: LinkedEntity[];
  suggested_tasks?: SuggestedTask[];
  missing_info?: FieldRequest[];
  recommended_agents?: string[];
  approval_reason?: string;
  explanation?: string;
  summary?: string;
}

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

function toStored(row: InboxRow): StoredInboxItem {
  const p = (row.payload ?? {}) as InboxPayload;
  const item: ProcessedInboxItem = {
    id: row.id,
    tenant_id: row.tenant_id,
    created_at: toIso(row.created_at),
    source: row.source,
    item_type: row.item_type as InboxItemType,
    category: row.category as InboxCategory,
    confidence: row.confidence,
    suggested_business: row.suggested_business,
    suggested_owner: row.suggested_owner,
    urgency: row.urgency,
    urgency_level: row.urgency_level as UrgencyLevel,
    next_action: row.next_action,
    linked_entities: p.linked_entities ?? [],
    suggested_tasks: p.suggested_tasks ?? [],
    missing_info: p.missing_info ?? [],
    recommended_agents: p.recommended_agents ?? [],
    saved_memory_id: row.saved_memory_id,
    requires_approval: row.requires_approval,
    approval_reason: p.approval_reason ?? "",
    dashboard_updated: row.dashboard_updated,
    explanation: p.explanation ?? "",
    summary: p.summary ?? "",
  };
  return { item, content: row.content, status: row.status as InboxItemStatus };
}

/**
 * Postgres-backed {@link InboxRepository} over `inbox_items`. Core scalar fields map to columns; the
 * variable-shape parts of the processed item (linked entities, tasks, missing info, agents,
 * approval reason, explanation, summary) are stored together in the `payload` jsonb and rehydrated
 * on read. Construct per unit of work from a tenant-scoped {@link Querier}; RLS isolates by tenant
 * via the connection's `app.tenant_id` GUC (the explicit predicates are defense-in-depth).
 */
export class PgInboxRepository implements InboxRepository {
  constructor(private readonly q: Querier) {}

  async save(stored: StoredInboxItem): Promise<void> {
    const it = stored.item;
    const payload = JSON.stringify({
      linked_entities: it.linked_entities,
      suggested_tasks: it.suggested_tasks,
      missing_info: it.missing_info,
      recommended_agents: it.recommended_agents,
      approval_reason: it.approval_reason,
      explanation: it.explanation,
      summary: it.summary,
    } satisfies InboxPayload);

    await this.q.query(
      `insert into inbox_items
         (id, tenant_id, source, item_type, category, confidence, suggested_business,
          suggested_owner, urgency, urgency_level, next_action, saved_memory_id, requires_approval,
          dashboard_updated, content, payload, status, created_at)
       values
         ($1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16::jsonb, $17, $18)
       on conflict (id) do update set
         source = excluded.source, item_type = excluded.item_type, category = excluded.category,
         confidence = excluded.confidence, suggested_business = excluded.suggested_business,
         suggested_owner = excluded.suggested_owner, urgency = excluded.urgency,
         urgency_level = excluded.urgency_level, next_action = excluded.next_action,
         saved_memory_id = excluded.saved_memory_id, requires_approval = excluded.requires_approval,
         dashboard_updated = excluded.dashboard_updated, content = excluded.content,
         payload = excluded.payload, status = excluded.status`,
      [
        it.id,
        it.tenant_id,
        it.source,
        it.item_type,
        it.category,
        it.confidence,
        it.suggested_business,
        it.suggested_owner,
        it.urgency,
        it.urgency_level,
        it.next_action,
        it.saved_memory_id,
        it.requires_approval,
        it.dashboard_updated,
        stored.content,
        payload,
        stored.status,
        it.created_at,
      ],
    );
  }

  async get(tenantId: string, id: string): Promise<StoredInboxItem | null> {
    const res = await this.q.query(
      `select ${INBOX_COLS} from inbox_items where id = $1 and tenant_id = $2`,
      [id, tenantId],
    );
    const row = (res.rows as InboxRow[])[0];
    return row ? toStored(row) : null;
  }

  async list(tenantId: string, filter: InboxListFilter = {}): Promise<StoredInboxItem[]> {
    const statuses = filter.statuses ?? [];
    const categories = filter.categories ?? [];
    const limit = filter.limit ?? 100;
    const res = await this.q.query(
      `select ${INBOX_COLS} from inbox_items
        where tenant_id = $1
          and (cardinality($2::text[]) = 0 or status = any($2::text[]))
          and (cardinality($3::text[]) = 0 or category = any($3::text[]))
        order by created_at desc
        limit $4`,
      [tenantId, statuses, categories, limit],
    );
    return (res.rows as InboxRow[]).map(toStored);
  }

  async setStatus(tenantId: string, id: string, status: InboxItemStatus): Promise<void> {
    await this.q.query(`update inbox_items set status = $3 where id = $1 and tenant_id = $2`, [
      id,
      tenantId,
      status,
    ]);
  }
}
