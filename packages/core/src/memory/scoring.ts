import type { MemoryRecord, MemoryQuery } from "@alfy2/shared";

/**
 * Deterministic scoring for the Memory Engine (no AI). Two scores:
 *  - retrievalScore: how well a memory answers a recall query (relevance × importance × confidence × recency).
 *  - pruneScore: how disposable a memory is (low importance/confidence, unused, stale).
 * All inputs are explicit so the engine stays testable and reproducible.
 * See docs/adr/ADR-0002-memory-engine.md.
 */

export interface RetrievalWeights {
  relevance: number;
  importance: number;
  confidence: number;
  recency: number;
}

export const DEFAULT_RETRIEVAL_WEIGHTS: RetrievalWeights = {
  relevance: 0.4,
  importance: 0.25,
  confidence: 0.15,
  recency: 0.2,
};

const STOPWORDS = new Set(["the", "and", "for", "with", "a", "an", "of", "to", "in", "on", "is"]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/** 0..1 keyword/text overlap between a query and a memory. Empty query => 0 (ranks by other factors). */
export function relevance(memory: MemoryRecord, query: MemoryQuery): number {
  const queryTerms = new Set<string>([
    ...tokenize(query.text ?? ""),
    ...query.keywords.flatMap(tokenize),
  ]);
  if (queryTerms.size === 0) return 0;

  const haystack = new Set<string>([
    ...tokenize(memory.title),
    ...tokenize(memory.body),
    ...memory.keywords.flatMap(tokenize),
  ]);
  const blob = `${memory.title} ${memory.body} ${memory.keywords.join(" ")}`.toLowerCase();

  let matched = 0;
  for (const term of queryTerms) {
    if (haystack.has(term) || blob.includes(term)) matched++;
  }
  return matched / queryTerms.size;
}

/** Exponential recency decay in [0,1]. Future/zero-age => 1; one half-life old => 0.5. */
export function recency(
  referenceIso: string | null,
  now: Date,
  halfLifeDays: number,
): number {
  if (!referenceIso) return 0;
  const ageMs = now.getTime() - new Date(referenceIso).getTime();
  if (ageMs <= 0) return 1;
  const ageDays = ageMs / 86_400_000;
  return Math.min(1, Math.max(0, Math.pow(0.5, ageDays / halfLifeDays)));
}

export function retrievalScore(
  memory: MemoryRecord,
  query: MemoryQuery,
  now: Date,
  weights: RetrievalWeights,
  halfLifeDays: number,
): number {
  const rel = relevance(memory, query);
  const rec = recency(memory.last_used_at ?? memory.created_at, now, halfLifeDays);
  return (
    weights.relevance * rel +
    weights.importance * memory.importance +
    weights.confidence * memory.confidence +
    weights.recency * rec
  );
}

/**
 * 0..1 eviction score. Mirrors the SQL `memory_prune_candidates` view's base
 * (1-importance)(1-confidence)(1/(1+use_count)) and layers a staleness factor on top.
 */
export function pruneScore(memory: MemoryRecord, now: Date, halfLifeDays: number): number {
  const staleness = 1 - recency(memory.last_used_at ?? memory.created_at, now, halfLifeDays);
  return (1 - memory.importance) * (1 - memory.confidence) * (1 / (1 + memory.use_count)) * staleness;
}
