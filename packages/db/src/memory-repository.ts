import type {
  MemoryRecord,
  MemoryLink,
  MemoryKind,
  MemoryStatus,
  MemoryRelation,
} from "@alfy2/shared";
import type { MemoryRepository, RepoFilter } from "@alfy2/core";
import type { Querier } from "./client.js";

// Contract columns for `memories` (excludes the generated `search_tsv`, which is never read back).
const MEMORY_COLS =
  "id, tenant_id, kind, title, body, attributes, importance, confidence, source, source_ref, " +
  "keywords, status, use_count, last_used_at, expires_at, superseded_by, created_at, updated_at";

const LINK_COLS =
  "id, tenant_id, from_memory_id, to_memory_id, relation, weight, created_at";

interface MemoryRow {
  id: string;
  tenant_id: string;
  kind: string;
  title: string;
  body: string;
  attributes: unknown;
  importance: number;
  confidence: number;
  source: string;
  source_ref: string | null;
  keywords: string[];
  status: string;
  use_count: number;
  last_used_at: Date | string | null;
  expires_at: Date | string | null;
  superseded_by: string | null;
  created_at: Date | string;
  updated_at: Date | string | null;
}

interface LinkRow {
  id: string;
  tenant_id: string;
  from_memory_id: string;
  to_memory_id: string;
  relation: string;
  weight: number;
  created_at: Date | string;
}

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}
function toIsoOrNull(v: Date | string | null): string | null {
  return v === null ? null : toIso(v);
}

function toRecord(r: MemoryRow): MemoryRecord {
  return {
    id: r.id,
    tenant_id: r.tenant_id,
    kind: r.kind as MemoryKind,
    title: r.title,
    body: r.body,
    attributes: (r.attributes ?? {}) as Record<string, unknown>,
    importance: r.importance,
    confidence: r.confidence,
    source: r.source,
    keywords: r.keywords,
    status: r.status as MemoryStatus,
    use_count: r.use_count,
    last_used_at: toIsoOrNull(r.last_used_at),
    expires_at: toIsoOrNull(r.expires_at),
    superseded_by: r.superseded_by,
    created_at: toIso(r.created_at),
    updated_at: toIsoOrNull(r.updated_at),
    // source_ref is `?: string` (not nullable) in the contract — omit the key when NULL rather than
    // setting it to undefined (exactOptionalPropertyTypes).
    ...(r.source_ref !== null ? { source_ref: r.source_ref } : {}),
  };
}

function toLink(r: LinkRow): MemoryLink {
  return {
    id: r.id,
    tenant_id: r.tenant_id,
    from_memory_id: r.from_memory_id,
    to_memory_id: r.to_memory_id,
    relation: r.relation as MemoryRelation,
    weight: r.weight,
    created_at: toIso(r.created_at),
  };
}

/**
 * Postgres-backed {@link MemoryRepository} over the `memories` + `memory_links` tables.
 *
 * Construct one per unit of work from a tenant-scoped {@link Querier}
 * (`db.withTenant(tenantId, (q) => new PgMemoryRepository(q)...)`). Tenant isolation is enforced by
 * the database's RLS via the connection's `app.tenant_id` GUC; the explicit `tenant_id = $n`
 * predicates below are defense-in-depth (and keep behaviour correct even under a bypassing role).
 * Ranking is intentionally NOT done here — the engine ranks the prefiltered candidate set.
 */
export class PgMemoryRepository implements MemoryRepository {
  constructor(private readonly q: Querier) {}

  async save(m: MemoryRecord): Promise<void> {
    await this.q.query(
      `insert into memories
         (id, tenant_id, kind, title, body, attributes, importance, confidence, source,
          source_ref, keywords, status, use_count, last_used_at, expires_at, superseded_by, created_at)
       values
         ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9,
          $10, $11::text[], $12, $13, $14, $15, $16, $17)
       on conflict (id) do update set
         kind = excluded.kind, title = excluded.title, body = excluded.body,
         attributes = excluded.attributes, importance = excluded.importance,
         confidence = excluded.confidence, source = excluded.source,
         source_ref = excluded.source_ref, keywords = excluded.keywords,
         status = excluded.status, use_count = excluded.use_count,
         last_used_at = excluded.last_used_at, expires_at = excluded.expires_at,
         superseded_by = excluded.superseded_by`,
      [
        m.id,
        m.tenant_id,
        m.kind,
        m.title,
        m.body,
        JSON.stringify(m.attributes),
        m.importance,
        m.confidence,
        m.source,
        m.source_ref ?? null,
        m.keywords,
        m.status,
        m.use_count,
        m.last_used_at,
        m.expires_at,
        m.superseded_by,
        m.created_at,
      ],
    );
  }

  async get(tenantId: string, id: string): Promise<MemoryRecord | null> {
    const res = await this.q.query(
      `select ${MEMORY_COLS} from memories where id = $1 and tenant_id = $2`,
      [id, tenantId],
    );
    const row = (res.rows as MemoryRow[])[0];
    return row ? toRecord(row) : null;
  }

  async search(tenantId: string, filter: RepoFilter): Promise<MemoryRecord[]> {
    const res = await this.q.query(
      `select ${MEMORY_COLS} from memories
        where tenant_id = $1
          and (case when $2 then status <> 'superseded' else status = 'active' end)
          and (cardinality($3::text[]) = 0 or kind = any($3::text[]))
          and importance >= $4
          and confidence >= $5`,
      [tenantId, filter.includeArchived, filter.kinds, filter.minImportance, filter.minConfidence],
    );
    return (res.rows as MemoryRow[]).map(toRecord);
  }

  async all(tenantId: string): Promise<MemoryRecord[]> {
    const res = await this.q.query(
      `select ${MEMORY_COLS} from memories where tenant_id = $1`,
      [tenantId],
    );
    return (res.rows as MemoryRow[]).map(toRecord);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.q.query(`delete from memories where id = $1 and tenant_id = $2`, [id, tenantId]);
  }

  async addLink(link: MemoryLink): Promise<void> {
    await this.q.query(
      `insert into memory_links
         (id, tenant_id, from_memory_id, to_memory_id, relation, weight, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (tenant_id, from_memory_id, to_memory_id, relation)
         do update set weight = excluded.weight`,
      [
        link.id,
        link.tenant_id,
        link.from_memory_id,
        link.to_memory_id,
        link.relation,
        link.weight,
        link.created_at,
      ],
    );
  }

  async linksFrom(tenantId: string, fromId: string): Promise<MemoryLink[]> {
    const res = await this.q.query(
      `select ${LINK_COLS} from memory_links where tenant_id = $1 and from_memory_id = $2`,
      [tenantId, fromId],
    );
    return (res.rows as LinkRow[]).map(toLink);
  }

  async removeLinksFor(tenantId: string, memoryId: string): Promise<void> {
    await this.q.query(
      `delete from memory_links
        where tenant_id = $1 and (from_memory_id = $2 or to_memory_id = $2)`,
      [tenantId, memoryId],
    );
  }
}
