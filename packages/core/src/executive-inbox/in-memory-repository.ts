import type {
  InboxRepository,
  StoredInboxItem,
  InboxListFilter,
  InboxItemStatus,
} from "./repository.js";

/**
 * Reference {@link InboxRepository} backed by an in-process Map. For tests and local runs only — the
 * production store is the Supabase-backed `inbox_items` table. Tenant isolation here is by filtering
 * on tenant_id (the database does it via RLS).
 */
export class InMemoryInboxRepository implements InboxRepository {
  private readonly items = new Map<string, StoredInboxItem>();

  async save(stored: StoredInboxItem): Promise<void> {
    this.items.set(stored.item.id, structuredClone(stored));
  }

  async get(tenantId: string, id: string): Promise<StoredInboxItem | null> {
    const s = this.items.get(id);
    return s && s.item.tenant_id === tenantId ? structuredClone(s) : null;
  }

  async list(tenantId: string, filter: InboxListFilter = {}): Promise<StoredInboxItem[]> {
    const statuses = filter.statuses && filter.statuses.length > 0 ? new Set(filter.statuses) : null;
    const cats = filter.categories && filter.categories.length > 0 ? new Set(filter.categories) : null;
    let out = [...this.items.values()].filter((s) => s.item.tenant_id === tenantId);
    if (statuses) out = out.filter((s) => statuses.has(s.status));
    if (cats) out = out.filter((s) => cats.has(s.item.category));
    out.sort((a, b) => b.item.created_at.localeCompare(a.item.created_at)); // newest first
    if (filter.limit !== undefined) out = out.slice(0, filter.limit);
    return out.map((s) => structuredClone(s));
  }

  async setStatus(tenantId: string, id: string, status: InboxItemStatus): Promise<void> {
    const s = this.items.get(id);
    if (s && s.item.tenant_id === tenantId) s.status = status;
  }
}
