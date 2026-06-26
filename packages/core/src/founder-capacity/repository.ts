import type { FounderCapacitySnapshot } from "@alfy2/shared";

/**
 * Persistence PORT for the Founder Capacity Layer (§31). Core defines the interface only; the concrete
 * store (Supabase, append-only table `founder_capacity_snapshots`) is injected so the engine stays
 * infrastructure-free. An in-memory reference implementation ships for tests and local runs.
 *
 * The store is append-only: snapshots are inserted, never mutated. {@link getLatest} returns the
 * newest reading (by `as_of`) for a tenant; {@link list} returns readings newest-first.
 */
export interface FounderCapacityRepository {
  /** Append a capacity snapshot (within its tenant). */
  save(snap: FounderCapacitySnapshot): Promise<void>;
  /** The newest snapshot for the tenant (by `as_of`), or null if none. */
  getLatest(tenantId: string): Promise<FounderCapacitySnapshot | null>;
  /** Tenant-scoped list, newest first. Default limit 30. */
  list(tenantId: string, limit?: number): Promise<FounderCapacitySnapshot[]>;
}
