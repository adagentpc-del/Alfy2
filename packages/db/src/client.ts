import { Pool } from "pg";
import type { PoolClient, QueryResult } from "pg";

/**
 * The minimal query surface a repository needs. It is satisfied by a pooled client that is already
 * inside a tenant transaction (see {@link Db.withTenant}), so every query inherits the
 * `app.tenant_id` GUC and is therefore filtered by the database's RLS policies.
 *
 * Intentionally tiny and infra-agnostic so repositories depend on this, not on `pg` directly.
 */
export interface Querier {
  query(text: string, params?: readonly unknown[]): Promise<QueryResult>;
}

export interface DbOptions {
  /** Postgres connection string (Supabase pooler), e.g. config `DATABASE_URL`. */
  connectionString: string;
  /** Max pool size. Default 10. */
  max?: number;
  /** Statement timeout (ms) applied per pooled connection. Default 15000. */
  statementTimeoutMs?: number;
}

/**
 * Tenant-scoped Postgres access for Alfy².
 *
 * The schema's RLS policies key off `current_setting('app.tenant_id', true)`, so isolation is only
 * enforced when that GUC is set on the connection running the query. {@link withTenant} opens a
 * transaction, sets the GUC LOCAL (scoped to that transaction), runs the unit of work, and commits
 * (or rolls back on throw). Repositories receive the in-transaction {@link Querier}; they must use
 * it for every read/write so the GUC — and thus RLS — applies.
 */
export class Db {
  private readonly pool: Pool;
  private readonly statementTimeoutMs: number;

  constructor(opts: DbOptions) {
    if (!opts.connectionString) {
      throw new Error("Db: connectionString is required (set DATABASE_URL).");
    }
    this.statementTimeoutMs = opts.statementTimeoutMs ?? 15_000;
    this.pool = new Pool({ connectionString: opts.connectionString, max: opts.max ?? 10 });
  }

  /**
   * Run `fn` inside a transaction scoped to `tenantId` (and optionally `businessId`). The values are
   * applied as LOCAL GUCs via `set_config(..., true)`, so they vanish when the transaction ends and
   * never leak across pooled connections. Commits on success; rolls back on any throw.
   */
  async withTenant<T>(
    tenantId: string,
    fn: (q: Querier) => Promise<T>,
    businessId?: string,
  ): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(`set local statement_timeout = ${this.statementTimeoutMs}`);
      await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
      if (businessId !== undefined) {
        await client.query("select set_config('app.business_id', $1, true)", [businessId]);
      }
      const q: Querier = {
        query: (text, params) => client.query(text, params ? [...params] : undefined),
      };
      const out = await fn(q);
      await client.query("commit");
      return out;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Close the pool. Call on graceful shutdown. */
  async end(): Promise<void> {
    await this.pool.end();
  }
}
