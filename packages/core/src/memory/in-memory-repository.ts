import type { MemoryRecord, MemoryLink } from "@alfy2/shared";
import type { MemoryRepository, RepoFilter } from "./repository.js";

/**
 * Reference MemoryRepository backed by in-process Maps. For tests and local runs only — the
 * production store is the Supabase-backed `memories`/`memory_links` tables. Tenant isolation here
 * is enforced by filtering on tenant_id (the DB does it via RLS).
 */
export class InMemoryMemoryRepository implements MemoryRepository {
  private readonly memories = new Map<string, MemoryRecord>();
  private readonly links = new Map<string, MemoryLink>();

  async save(memory: MemoryRecord): Promise<void> {
    this.memories.set(memory.id, structuredClone(memory));
  }

  async get(tenantId: string, id: string): Promise<MemoryRecord | null> {
    const m = this.memories.get(id);
    return m && m.tenant_id === tenantId ? structuredClone(m) : null;
  }

  async search(tenantId: string, filter: RepoFilter): Promise<MemoryRecord[]> {
    const kinds = new Set(filter.kinds);
    return [...this.memories.values()]
      .filter((m) => m.tenant_id === tenantId)
      .filter((m) => (filter.includeArchived ? m.status !== "superseded" : m.status === "active"))
      .filter((m) => (kinds.size === 0 ? true : kinds.has(m.kind)))
      .filter((m) => m.importance >= filter.minImportance && m.confidence >= filter.minConfidence)
      .map((m) => structuredClone(m));
  }

  async all(tenantId: string): Promise<MemoryRecord[]> {
    return [...this.memories.values()]
      .filter((m) => m.tenant_id === tenantId)
      .map((m) => structuredClone(m));
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const m = this.memories.get(id);
    if (m && m.tenant_id === tenantId) this.memories.delete(id);
  }

  async addLink(link: MemoryLink): Promise<void> {
    this.links.set(link.id, structuredClone(link));
  }

  async linksFrom(tenantId: string, fromId: string): Promise<MemoryLink[]> {
    return [...this.links.values()]
      .filter((l) => l.tenant_id === tenantId && l.from_memory_id === fromId)
      .map((l) => structuredClone(l));
  }

  async removeLinksFor(tenantId: string, memoryId: string): Promise<void> {
    for (const [id, l] of this.links) {
      if (l.tenant_id === tenantId && (l.from_memory_id === memoryId || l.to_memory_id === memoryId)) {
        this.links.delete(id);
      }
    }
  }
}
