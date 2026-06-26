import type { FounderCapacitySnapshot } from "@alfy2/shared";
import type { FounderCapacityRepository } from "./repository.js";

/**
 * Reference {@link FounderCapacityRepository} backed by an in-process Map keyed by tenant. For tests
 * and local runs only — the production store is the Supabase-backed, append-only
 * `founder_capacity_snapshots` table. Tenant isolation here is by the map key (the database does it
 * via RLS).
 */
export class InMemoryFounderCapacityRepository implements FounderCapacityRepository {
  private readonly byTenant = new Map<string, FounderCapacitySnapshot[]>();

  async save(snap: FounderCapacitySnapshot): Promise<void> {
    const list = this.byTenant.get(snap.tenant_id) ?? [];
    list.push(structuredClone(snap));
    this.byTenant.set(snap.tenant_id, list);
  }

  async getLatest(tenantId: string): Promise<FounderCapacitySnapshot | null> {
    const list = this.byTenant.get(tenantId);
    if (!list || list.length === 0) return null;
    let newest = list[0]!;
    for (const s of list) {
      if (s.as_of.localeCompare(newest.as_of) > 0) newest = s;
    }
    return structuredClone(newest);
  }

  async list(tenantId: string, limit = 30): Promise<FounderCapacitySnapshot[]> {
    const list = [...(this.byTenant.get(tenantId) ?? [])];
    list.sort((a, b) => b.as_of.localeCompare(a.as_of)); // newest first
    return list.slice(0, limit).map((s) => structuredClone(s));
  }
}
