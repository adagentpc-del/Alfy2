import type { MemoryRecord, MemoryLink, MemoryKind } from "@alfy2/shared";

/**
 * Persistence PORT for the Memory Engine. Core defines the interface only; the concrete store
 * (Supabase, tables `memories` + `memory_links`) is injected later so the engine stays infra-free.
 * An in-memory reference implementation ships for tests and local runs.
 *
 * The repository does cheap PREFILTERING only (tenant scope, kind, status, thresholds). All ranking
 * lives in the engine via scoring.ts so it is portable and reproducible.
 */

export interface RepoFilter {
  kinds: MemoryKind[];
  includeArchived: boolean;
  minImportance: number;
  minConfidence: number;
}

export interface MemoryRepository {
  /** Insert or replace a memory by id (within its tenant). */
  save(memory: MemoryRecord): Promise<void>;
  get(tenantId: string, id: string): Promise<MemoryRecord | null>;
  /** Prefiltered candidate set for recall. Ranking is the engine's job. */
  search(tenantId: string, filter: RepoFilter): Promise<MemoryRecord[]>;
  /** Every memory for a tenant (used by the pruning scan). */
  all(tenantId: string): Promise<MemoryRecord[]>;
  remove(tenantId: string, id: string): Promise<void>;

  addLink(link: MemoryLink): Promise<void>;
  /** Outgoing links from a memory, optionally filtered by relation. */
  linksFrom(tenantId: string, fromId: string): Promise<MemoryLink[]>;
  /** Remove all links touching a memory (either endpoint). */
  removeLinksFor(tenantId: string, memoryId: string): Promise<void>;
}
