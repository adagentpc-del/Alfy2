import {
  CreateMemoryInputSchema,
  MemoryQuerySchema,
  type CreateMemoryInput,
  type MemoryQuery,
  type MemoryRecord,
  type MemoryLink,
  type MemoryRelation,
} from "@alfy2/shared";
import type { MemoryRepository } from "./repository.js";
import {
  retrievalScore,
  pruneScore,
  DEFAULT_RETRIEVAL_WEIGHTS,
  type RetrievalWeights,
} from "./scoring.js";

/**
 * The Memory Engine — Alfy2's permanent brain (docs/adr/ADR-0002-memory-engine.md).
 * High-level API over a MemoryRepository: remember, recall, reinforce, revise, supersede, link,
 * traverse, and prune. All logic is deterministic (no AI). Tenant-scoped on every call.
 */

export interface MemoryEngineOptions {
  /** Injected clock for reproducible tests. */
  clock?: () => Date;
  retrievalWeights?: RetrievalWeights;
  /** Recency half-life in days (used by both retrieval recency and prune staleness). */
  recencyHalfLifeDays?: number;
  /** importance >= this is "pinned" and never auto-pruned (unless expired). */
  pinnedImportance?: number;
  /** pruneScore strictly above this marks a memory disposable. */
  pruneThreshold?: number;
  idFactory?: () => string;
}

export interface RecallResult {
  memory: MemoryRecord;
  score: number;
}

export interface PruneOptions {
  /** Hard-delete instead of archiving (also removes the memory's links). */
  hardDelete?: boolean;
}

export interface PruneSummary {
  scanned: number;
  prunedIds: string[];
  mode: "archived" | "deleted";
}

/** Fields a caller may revise on an existing memory. Omitted fields are left untouched. */
export interface MemoryPatch {
  title?: string;
  body?: string;
  attributes?: Record<string, unknown>;
  importance?: number;
  confidence?: number;
  keywords?: string[];
  source_ref?: string;
  expires_at?: string | null;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export class MemoryEngine {
  private readonly repo: MemoryRepository;
  private readonly clock: () => Date;
  private readonly weights: RetrievalWeights;
  private readonly halfLifeDays: number;
  private readonly pinnedImportance: number;
  private readonly pruneThreshold: number;
  private readonly newId: () => string;

  constructor(repo: MemoryRepository, options: MemoryEngineOptions = {}) {
    this.repo = repo;
    this.clock = options.clock ?? (() => new Date());
    this.weights = options.retrievalWeights ?? DEFAULT_RETRIEVAL_WEIGHTS;
    this.halfLifeDays = options.recencyHalfLifeDays ?? 30;
    this.pinnedImportance = options.pinnedImportance ?? 0.8;
    this.pruneThreshold = options.pruneThreshold ?? 0.5;
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Create -------------------------------------------------------------

  /** Store a new memory. Applies schema defaults; assigns id and timestamps. */
  async remember(tenantId: string, input: CreateMemoryInput): Promise<MemoryRecord> {
    const parsed = CreateMemoryInputSchema.parse(input);
    const nowIso = this.nowIso();
    const record: MemoryRecord = {
      id: this.newId(),
      tenant_id: tenantId,
      kind: parsed.kind,
      title: parsed.title,
      body: parsed.body,
      attributes: parsed.attributes,
      importance: parsed.importance,
      confidence: parsed.confidence,
      source: parsed.source,
      keywords: parsed.keywords,
      status: "active",
      use_count: 0,
      last_used_at: null,
      expires_at: parsed.expires_at,
      superseded_by: null,
      created_at: nowIso,
      updated_at: null,
      ...(parsed.source_ref !== undefined ? { source_ref: parsed.source_ref } : {}),
    };
    await this.repo.save(record);
    return record;
  }

  // --- Retrieve -----------------------------------------------------------

  /**
   * Recall the most relevant memories for a query, ranked by
   * relevance × importance × confidence × recency. Recalling a memory REINFORCES it:
   * use_count++ and last_used_at = now (this is the engine's primary "updating" signal).
   */
  async recall(tenantId: string, query: MemoryQuery): Promise<RecallResult[]> {
    const now = this.clock();
    const ranked = await this.rank(tenantId, query, now);

    // Touch (reinforce usage) the returned memories.
    const nowIso = now.toISOString();
    const results: RecallResult[] = [];
    for (const { memory, score } of ranked) {
      const touched: MemoryRecord = {
        ...memory,
        use_count: memory.use_count + 1,
        last_used_at: nowIso,
        updated_at: nowIso,
      };
      await this.repo.save(touched);
      results.push({ memory: touched, score });
    }
    return results;
  }

  /**
   * Read-only retrieval: identical ranking to `recall` but WITHOUT reinforcing (no use_count bump,
   * no last_used_at change, no writes). Used by coordination layers (e.g. the Chief of Staff) that
   * must observe memory without mutating it.
   */
  async peek(tenantId: string, query: MemoryQuery): Promise<RecallResult[]> {
    return this.rank(tenantId, query, this.clock());
  }

  /** Shared candidate-fetch + scoring used by both recall (mutating) and peek (read-only). */
  private async rank(
    tenantId: string,
    query: MemoryQuery,
    now: Date,
  ): Promise<RecallResult[]> {
    const q = MemoryQuerySchema.parse(query);
    const candidates = await this.repo.search(tenantId, {
      kinds: q.kinds,
      includeArchived: q.include_archived,
      minImportance: q.min_importance,
      minConfidence: q.min_confidence,
    });
    return candidates
      .map((memory) => ({
        memory,
        score: retrievalScore(memory, q, now, this.weights, this.halfLifeDays),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, q.limit);
  }

  /** Direct fetch by id (does not reinforce). */
  async get(tenantId: string, id: string): Promise<MemoryRecord | null> {
    return this.repo.get(tenantId, id);
  }

  // --- Update -------------------------------------------------------------

  /** Nudge importance/confidence (clamped to 0..1) and mark the memory used. */
  async reinforce(
    tenantId: string,
    id: string,
    delta: { importance?: number; confidence?: number },
  ): Promise<MemoryRecord> {
    const memory = await this.requireMemory(tenantId, id);
    const nowIso = this.nowIso();
    const updated: MemoryRecord = {
      ...memory,
      importance: clamp01(memory.importance + (delta.importance ?? 0)),
      confidence: clamp01(memory.confidence + (delta.confidence ?? 0)),
      use_count: memory.use_count + 1,
      last_used_at: nowIso,
      updated_at: nowIso,
    };
    await this.repo.save(updated);
    return updated;
  }

  /** Edit fields on a memory. Only provided fields change. */
  async revise(tenantId: string, id: string, patch: MemoryPatch): Promise<MemoryRecord> {
    const memory = await this.requireMemory(tenantId, id);
    const updated: MemoryRecord = {
      ...memory,
      title: patch.title ?? memory.title,
      body: patch.body ?? memory.body,
      attributes: patch.attributes ?? memory.attributes,
      importance: patch.importance !== undefined ? clamp01(patch.importance) : memory.importance,
      confidence: patch.confidence !== undefined ? clamp01(patch.confidence) : memory.confidence,
      keywords: patch.keywords ?? memory.keywords,
      expires_at: patch.expires_at !== undefined ? patch.expires_at : memory.expires_at,
      updated_at: this.nowIso(),
      ...(patch.source_ref !== undefined
        ? { source_ref: patch.source_ref }
        : memory.source_ref !== undefined
          ? { source_ref: memory.source_ref }
          : {}),
    };
    await this.repo.save(updated);
    return updated;
  }

  /**
   * Replace a memory with a newer version: creates the new memory, marks the old one superseded,
   * and links new --supersedes--> old. Keeps history rather than destroying it.
   */
  async supersede(
    tenantId: string,
    oldId: string,
    input: CreateMemoryInput,
  ): Promise<MemoryRecord> {
    const old = await this.requireMemory(tenantId, oldId);
    const replacement = await this.remember(tenantId, input);
    const nowIso = this.nowIso();
    await this.repo.save({
      ...old,
      status: "superseded",
      superseded_by: replacement.id,
      updated_at: nowIso,
    });
    await this.link(tenantId, replacement.id, old.id, "supersedes");
    return replacement;
  }

  // --- Link / traverse ----------------------------------------------------

  /** Create a typed edge between two existing memories. */
  async link(
    tenantId: string,
    fromId: string,
    toId: string,
    relation: MemoryRelation,
    weight = 1,
  ): Promise<MemoryLink> {
    await this.requireMemory(tenantId, fromId);
    await this.requireMemory(tenantId, toId);
    const link: MemoryLink = {
      id: this.newId(),
      tenant_id: tenantId,
      from_memory_id: fromId,
      to_memory_id: toId,
      relation,
      weight: clamp01(weight),
      created_at: this.nowIso(),
    };
    await this.repo.addLink(link);
    return link;
  }

  /** Outgoing links from a memory, optionally filtered by relation. */
  async neighbors(
    tenantId: string,
    id: string,
    relation?: MemoryRelation,
  ): Promise<MemoryLink[]> {
    const links = await this.repo.linksFrom(tenantId, id);
    return relation ? links.filter((l) => l.relation === relation) : links;
  }

  /** Resolve the memories a memory points at (optionally by relation). */
  async relatedMemories(
    tenantId: string,
    id: string,
    relation?: MemoryRelation,
  ): Promise<MemoryRecord[]> {
    const links = await this.neighbors(tenantId, id, relation);
    const out: MemoryRecord[] = [];
    for (const link of links) {
      const m = await this.repo.get(tenantId, link.to_memory_id);
      if (m) out.push(m);
    }
    return out;
  }

  // --- Prune --------------------------------------------------------------

  /**
   * Evict disposable memories. A memory is pruned if it is EXPIRED, or if it is not pinned
   * (importance < pinnedImportance) and its pruneScore exceeds the threshold. Default mode archives
   * (recoverable); hardDelete removes the memory and its links.
   */
  async prune(tenantId: string, options: PruneOptions = {}): Promise<PruneSummary> {
    const now = this.clock();
    const nowMs = now.getTime();
    const memories = (await this.repo.all(tenantId)).filter((m) => m.status === "active");

    const prunedIds: string[] = [];
    for (const memory of memories) {
      const expired = memory.expires_at !== null && new Date(memory.expires_at).getTime() <= nowMs;
      const disposable =
        memory.importance < this.pinnedImportance &&
        pruneScore(memory, now, this.halfLifeDays) > this.pruneThreshold;

      if (!expired && !disposable) continue;

      if (options.hardDelete) {
        await this.repo.removeLinksFor(tenantId, memory.id);
        await this.repo.remove(tenantId, memory.id);
      } else {
        await this.repo.save({ ...memory, status: "archived", updated_at: now.toISOString() });
      }
      prunedIds.push(memory.id);
    }

    return {
      scanned: memories.length,
      prunedIds,
      mode: options.hardDelete ? "deleted" : "archived",
    };
  }

  /** Archive or delete a single memory by id. */
  async forget(tenantId: string, id: string, hardDelete = false): Promise<void> {
    const memory = await this.requireMemory(tenantId, id);
    if (hardDelete) {
      await this.repo.removeLinksFor(tenantId, id);
      await this.repo.remove(tenantId, id);
    } else {
      await this.repo.save({ ...memory, status: "archived", updated_at: this.nowIso() });
    }
  }

  // --- internals ----------------------------------------------------------

  private async requireMemory(tenantId: string, id: string): Promise<MemoryRecord> {
    const m = await this.repo.get(tenantId, id);
    if (!m) throw new Error(`Unknown memory: ${id}`);
    return m;
  }

  private nowIso(): string {
    return this.clock().toISOString();
  }
}
