import { z } from "zod";

/**
 * Memory Engine contracts (the permanent brain of Alfy2). See docs/adr/ADR-0002-memory-engine.md.
 * Every memory carries the metadata the operator cares about: importance, confidence, source,
 * keywords, last-used, and (via memory_links) relationships. Mirrored in workers (Pydantic) and
 * validated against shared fixtures.
 */

/** The catalog of things Alfy2 remembers. snake_case, stable identifiers. */
export const MemoryKindSchema = z.enum([
  "business",
  "project",
  "person",
  "company",
  "meeting",
  "conversation",
  "task",
  "idea",
  "preference",
  "pattern",
  "vehicle",
  "home",
  "doctor",
  "contract",
  "subscription",
  "account",
  "health_event", // health history
  "decision", // decision history
  "lesson", // lessons learned
  "pet", // Personal OS: pets
  "trip", // Personal OS: travel
  "goal", // Personal OS: goals
]);
export type MemoryKind = z.infer<typeof MemoryKindSchema>;

/** Typed edges in the memory graph. */
export const MemoryRelationSchema = z.enum([
  "related_to",
  "about",
  "derived_from",
  "supersedes",
  "contradicts",
  "owns",
  "works_at",
  "attended",
  "member_of",
  "scheduled_for",
  "depends_on",
  "mentions",
  "located_at",
  "treats",
  "subscribes_to",
  "decided",
  "learned_from",
]);
export type MemoryRelation = z.infer<typeof MemoryRelationSchema>;

export const MemoryStatusSchema = z.enum(["active", "archived", "superseded"]);
export type MemoryStatus = z.infer<typeof MemoryStatusSchema>;

/** A single atomic memory. */
export const MemoryRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: MemoryKindSchema,
  /** Human label, e.g. a person's name or a project title. */
  title: z.string().min(1),
  /** The content/summary of the memory. */
  body: z.string().default(""),
  /** Type-specific structured fields (e.g. a vehicle's VIN, a contract's renewal date). */
  attributes: z.record(z.unknown()).default({}),
  /** How much this matters, 0..1. Drives retrieval ranking and protects from pruning. */
  importance: z.number().min(0).max(1),
  /** How sure we are this is true, 0..1. */
  confidence: z.number().min(0).max(1),
  /** Where it came from, e.g. "operator", "agent:research.web", "meeting:2026-06-24". */
  source: z.string().min(1),
  source_ref: z.string().optional(),
  /** Search keywords for fast recall. */
  keywords: z.array(z.string()).default([]),
  status: MemoryStatusSchema.default("active"),
  /** Number of times this memory has been recalled. */
  use_count: z.number().int().nonnegative().default(0),
  last_used_at: z.string().datetime().nullable().default(null),
  /** Optional TTL; eligible for pruning once passed. */
  expires_at: z.string().datetime().nullable().default(null),
  /** If superseded, points at the replacement memory. */
  superseded_by: z.string().uuid().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type MemoryRecord = z.infer<typeof MemoryRecordSchema>;

/** A typed relationship between two memories. */
export const MemoryLinkSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  from_memory_id: z.string().uuid(),
  to_memory_id: z.string().uuid(),
  relation: MemoryRelationSchema,
  weight: z.number().min(0).max(1).default(1),
  created_at: z.string().datetime(),
});
export type MemoryLink = z.infer<typeof MemoryLinkSchema>;

/** Input to create/remember a memory. Defaults applied by the engine. */
export const CreateMemoryInputSchema = z.object({
  kind: MemoryKindSchema,
  title: z.string().min(1),
  body: z.string().default(""),
  attributes: z.record(z.unknown()).default({}),
  importance: z.number().min(0).max(1).default(0.5),
  confidence: z.number().min(0).max(1).default(0.6),
  source: z.string().min(1),
  source_ref: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  expires_at: z.string().datetime().nullable().default(null),
});
export type CreateMemoryInput = z.infer<typeof CreateMemoryInputSchema>;

/** A recall query against the memory store. */
export const MemoryQuerySchema = z.object({
  /** Free-text query, matched against title/body/keywords. */
  text: z.string().optional(),
  /** Explicit keyword filters (any-match). */
  keywords: z.array(z.string()).default([]),
  /** Restrict to these kinds. */
  kinds: z.array(MemoryKindSchema).default([]),
  min_importance: z.number().min(0).max(1).default(0),
  min_confidence: z.number().min(0).max(1).default(0),
  /** Max results. */
  limit: z.number().int().positive().max(200).default(10),
  include_archived: z.boolean().default(false),
});
export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;
