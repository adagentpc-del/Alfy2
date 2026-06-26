import type {
  CapitalAccount,
  CapitalAllocation,
  CapitalRunway,
} from "@alfy2/shared";
import type {
  CapitalAccountRepository,
  CapitalAllocationRepository,
  CapitalRunwayRepository,
} from "./repository.js";

/**
 * Reference in-memory implementations of the Capital Allocation PORTS. For tests and local runs only —
 * the production stores are the Supabase-backed `capital_accounts` / `capital_allocations` /
 * `capital_runway` tables. Tenant isolation here is by the composite map keys (the database does it via
 * RLS).
 */

function scope(tenantId: string, businessId: string): string {
  return `${tenantId}:${businessId}`;
}

/** Mutable account store, keyed by `${tenant}:${business}:${bucket}`. */
export class InMemoryCapitalAccountRepository implements CapitalAccountRepository {
  private readonly accounts = new Map<string, CapitalAccount>();

  private key(acc: Pick<CapitalAccount, "tenant_id" | "business_id" | "bucket">): string {
    return `${acc.tenant_id}:${acc.business_id}:${acc.bucket}`;
  }

  async upsert(acc: CapitalAccount): Promise<void> {
    this.accounts.set(this.key(acc), structuredClone(acc));
  }

  async list(tenantId: string, businessId: string): Promise<CapitalAccount[]> {
    return [...this.accounts.values()]
      .filter((a) => a.tenant_id === tenantId && a.business_id === businessId)
      .map((a) => structuredClone(a));
  }
}

/** Append-only allocation store, keyed by `${tenant}:${business}`. */
export class InMemoryCapitalAllocationRepository implements CapitalAllocationRepository {
  private readonly byScope = new Map<string, CapitalAllocation[]>();

  async insert(a: CapitalAllocation): Promise<void> {
    const k = scope(a.tenant_id, a.business_id);
    const list = this.byScope.get(k) ?? [];
    list.push(structuredClone(a));
    this.byScope.set(k, list);
  }

  async list(tenantId: string, businessId: string, limit = 100): Promise<CapitalAllocation[]> {
    const list = [...(this.byScope.get(scope(tenantId, businessId)) ?? [])];
    list.sort((a, b) => b.created_at.localeCompare(a.created_at)); // newest first
    return list.slice(0, limit).map((a) => structuredClone(a));
  }
}

/** Append-only runway store, keyed by `${tenant}:${business}`. */
export class InMemoryCapitalRunwayRepository implements CapitalRunwayRepository {
  private readonly byScope = new Map<string, CapitalRunway[]>();

  async insert(r: CapitalRunway): Promise<void> {
    const k = scope(r.tenant_id, r.business_id);
    const list = this.byScope.get(k) ?? [];
    list.push(structuredClone(r));
    this.byScope.set(k, list);
  }

  async getLatest(tenantId: string, businessId: string): Promise<CapitalRunway | null> {
    const list = this.byScope.get(scope(tenantId, businessId));
    if (!list || list.length === 0) return null;
    let newest = list[0]!;
    for (const r of list) {
      if (r.as_of.localeCompare(newest.as_of) > 0) newest = r;
    }
    return structuredClone(newest);
  }
}
