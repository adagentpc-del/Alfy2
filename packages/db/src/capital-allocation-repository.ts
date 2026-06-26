import type {
  CapitalAccount,
  CapitalAllocation,
  CapitalRunway,
  CapitalBucket,
  CapitalMode,
} from "@alfy2/shared";
import type {
  CapitalAccountRepository,
  CapitalAllocationRepository,
  CapitalRunwayRepository,
} from "@alfy2/core";
import type { Querier } from "./client.js";

// ---------------------------------------------------------------------------
// shared coercion helpers (pg returns numeric/timestamptz as strings)
// ---------------------------------------------------------------------------

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

function toNum(v: number | string): number {
  return typeof v === "string" ? Number(v) : v;
}

// ---------------------------------------------------------------------------
// capital_accounts (mutable; upsert by (tenant, business, bucket))
// ---------------------------------------------------------------------------

const ACCOUNT_COLS =
  "id, tenant_id, business_id, bucket, target_pct, balance, created_at, updated_at";

interface AccountRow {
  id: string;
  tenant_id: string;
  business_id: string;
  bucket: string;
  target_pct: number | string;
  balance: number | string;
  created_at: Date | string;
  updated_at: Date | string | null;
}

function toAccount(row: AccountRow): CapitalAccount {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    business_id: row.business_id,
    bucket: row.bucket as CapitalBucket,
    target_pct: toNum(row.target_pct),
    balance: toNum(row.balance),
    created_at: toIso(row.created_at),
    updated_at: row.updated_at === null ? null : toIso(row.updated_at),
  };
}

/**
 * Postgres-backed {@link CapitalAccountRepository} over the mutable `capital_accounts` table (§34).
 * Upsert keys on the unique (tenant_id, business_id, bucket). Construct per unit of work from a
 * tenant-scoped {@link Querier}; RLS isolates by tenant via the connection's `app.tenant_id` GUC (the
 * explicit predicates are defense-in-depth).
 */
export class PgCapitalAccountRepository implements CapitalAccountRepository {
  constructor(private readonly q: Querier) {}

  async upsert(acc: CapitalAccount): Promise<void> {
    await this.q.query(
      `insert into capital_accounts
         (id, tenant_id, business_id, bucket, target_pct, balance, created_at, updated_at)
       values
         ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (tenant_id, business_id, bucket) do update set
         target_pct = excluded.target_pct,
         balance = excluded.balance`,
      [
        acc.id,
        acc.tenant_id,
        acc.business_id,
        acc.bucket,
        acc.target_pct,
        acc.balance,
        acc.created_at,
        acc.updated_at,
      ],
    );
  }

  async list(tenantId: string, businessId: string): Promise<CapitalAccount[]> {
    const res = await this.q.query(
      `select ${ACCOUNT_COLS} from capital_accounts
        where tenant_id = $1 and business_id = $2
        order by bucket asc`,
      [tenantId, businessId],
    );
    return (res.rows as AccountRow[]).map(toAccount);
  }
}

// ---------------------------------------------------------------------------
// capital_allocations (append-only; split is jsonb)
// ---------------------------------------------------------------------------

const ALLOCATION_COLS =
  "id, tenant_id, business_id, inflow_usd, split, mode, recommended, approved, created_at";

interface AllocationRow {
  id: string;
  tenant_id: string;
  business_id: string;
  inflow_usd: number | string;
  split: unknown;
  mode: string;
  recommended: boolean;
  approved: boolean;
  created_at: Date | string;
}

function toAllocation(row: AllocationRow): CapitalAllocation {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    business_id: row.business_id,
    inflow_usd: toNum(row.inflow_usd),
    split: (row.split ?? {}) as Record<string, number>,
    mode: row.mode as CapitalMode,
    recommended: row.recommended,
    approved: row.approved,
    created_at: toIso(row.created_at),
  };
}

/**
 * Postgres-backed {@link CapitalAllocationRepository} over the append-only `capital_allocations` table
 * (§34): insert + select only. `split` is stored as `jsonb` (stringified on write, rehydrated on read).
 * RLS isolates by tenant via the connection's `app.tenant_id` GUC.
 */
export class PgCapitalAllocationRepository implements CapitalAllocationRepository {
  constructor(private readonly q: Querier) {}

  async insert(a: CapitalAllocation): Promise<void> {
    await this.q.query(
      `insert into capital_allocations
         (id, tenant_id, business_id, inflow_usd, split, mode, recommended, approved, created_at)
       values
         ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
      [
        a.id,
        a.tenant_id,
        a.business_id,
        a.inflow_usd,
        JSON.stringify(a.split),
        a.mode,
        a.recommended,
        a.approved,
        a.created_at,
      ],
    );
  }

  async list(tenantId: string, businessId: string, limit = 100): Promise<CapitalAllocation[]> {
    const res = await this.q.query(
      `select ${ALLOCATION_COLS} from capital_allocations
        where tenant_id = $1 and business_id = $2
        order by created_at desc
        limit $3`,
      [tenantId, businessId, limit],
    );
    return (res.rows as AllocationRow[]).map(toAllocation);
  }
}

// ---------------------------------------------------------------------------
// capital_runway (append-only)
// ---------------------------------------------------------------------------

const RUNWAY_COLS =
  "id, tenant_id, business_id, as_of, cash_usd, monthly_burn_usd, runway_days, " +
  "min_reserve_usd, mode, created_at";

interface RunwayRow {
  id: string;
  tenant_id: string;
  business_id: string;
  as_of: Date | string;
  cash_usd: number | string;
  monthly_burn_usd: number | string;
  runway_days: number;
  min_reserve_usd: number | string;
  mode: string;
  created_at: Date | string;
}

function toRunway(row: RunwayRow): CapitalRunway {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    business_id: row.business_id,
    as_of: toIso(row.as_of),
    cash_usd: toNum(row.cash_usd),
    monthly_burn_usd: toNum(row.monthly_burn_usd),
    runway_days: row.runway_days,
    min_reserve_usd: toNum(row.min_reserve_usd),
    mode: row.mode as CapitalMode,
    created_at: toIso(row.created_at),
  };
}

/**
 * Postgres-backed {@link CapitalRunwayRepository} over the append-only `capital_runway` table (§34):
 * insert + select only. RLS isolates by tenant via the connection's `app.tenant_id` GUC.
 */
export class PgCapitalRunwayRepository implements CapitalRunwayRepository {
  constructor(private readonly q: Querier) {}

  async insert(r: CapitalRunway): Promise<void> {
    await this.q.query(
      `insert into capital_runway
         (id, tenant_id, business_id, as_of, cash_usd, monthly_burn_usd, runway_days,
          min_reserve_usd, mode, created_at)
       values
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        r.id,
        r.tenant_id,
        r.business_id,
        r.as_of,
        r.cash_usd,
        r.monthly_burn_usd,
        r.runway_days,
        r.min_reserve_usd,
        r.mode,
        r.created_at,
      ],
    );
  }

  async getLatest(tenantId: string, businessId: string): Promise<CapitalRunway | null> {
    const res = await this.q.query(
      `select ${RUNWAY_COLS} from capital_runway
        where tenant_id = $1 and business_id = $2
        order by as_of desc
        limit 1`,
      [tenantId, businessId],
    );
    const row = (res.rows as RunwayRow[])[0];
    return row ? toRunway(row) : null;
  }
}
