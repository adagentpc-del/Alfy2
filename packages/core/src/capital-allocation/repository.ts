import type {
  CapitalAccount,
  CapitalAllocation,
  CapitalRunway,
} from "@alfy2/shared";

/**
 * Persistence PORTS for the Capital Allocation Engine (§34). Core defines the interfaces only; the
 * concrete stores (Supabase tables `capital_accounts` / `capital_allocations` / `capital_runway`) are
 * injected so the engine stays infrastructure-free. In-memory reference implementations ship for tests
 * and local runs.
 *
 * `capital_accounts` is MUTABLE (balances + policy upsert by (tenant, business, bucket)). The other two
 * are APPEND-ONLY: allocations and runway readings are inserted, never mutated.
 */

export interface CapitalAccountRepository {
  /** Insert-or-update an account by (tenant_id, business_id, bucket). */
  upsert(acc: CapitalAccount): Promise<void>;
  /** Tenant + business scoped list of the nine bucket accounts. */
  list(tenantId: string, businessId: string): Promise<CapitalAccount[]>;
}

export interface CapitalAllocationRepository {
  /** Append a recommended allocation (never mutated). */
  insert(a: CapitalAllocation): Promise<void>;
  /** Tenant + business scoped list, newest first. Default limit 100. */
  list(tenantId: string, businessId: string, limit?: number): Promise<CapitalAllocation[]>;
}

export interface CapitalRunwayRepository {
  /** Append a runway reading (never mutated). */
  insert(r: CapitalRunway): Promise<void>;
  /** The newest reading for the (tenant, business) by `as_of`, or null if none. */
  getLatest(tenantId: string, businessId: string): Promise<CapitalRunway | null>;
}
