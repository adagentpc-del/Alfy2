import { z } from "zod";
import { MemoryKindSchema } from "./memory.js";

/**
 * Personal OS contracts — Alfy2's life layer. Twelve modules. Core behavior: if information already
 * exists, reuse it; if not, ask for it ONCE and remember it forever (unless updated); next time,
 * auto-prepare everything. Built on the Memory Engine. See docs/adr/ADR-0007-personal-os.md.
 * Mirrored in workers (Pydantic).
 */

/** The life modules. Core behavior: anticipate needs before Alyssa asks, and prepare everything needed
 * rather than only creating reminders — reducing executive friction in everyday life. */
export const PersonalModuleKindSchema = z.enum([
  "vehicles",
  "travel",
  "appointments",
  "shopping",
  "pets",
  "home",
  "insurance",
  "bills",
  "maintenance",
  "health",
  "goals",
  "relationships",
  "subscriptions",
  "events",
  "errands",
]);
export type PersonalModuleKind = z.infer<typeof PersonalModuleKindSchema>;

/** Catalog definition of an entity type within a module (e.g. a vehicle dealership). */
export const PersonalEntitySpecSchema = z.object({
  module: PersonalModuleKindSchema,
  /** snake_case type, e.g. "dealership", "vehicle", "policy", "flight". */
  entity_type: z.string().min(1),
  name: z.string().min(1),
  /** Which memory kind this entity is stored as. */
  memory_kind: MemoryKindSchema,
  /** Fields that must be known for the entity to be "complete". */
  required_fields: z.array(z.string()).min(1),
  optional_fields: z.array(z.string()).default([]),
});
export type PersonalEntitySpec = z.infer<typeof PersonalEntitySpecSchema>;

/** A single field the system needs from the operator. */
export const FieldRequestSchema = z.object({
  field: z.string().min(1),
  prompt: z.string().min(1),
  required: z.boolean(),
});
export type FieldRequest = z.infer<typeof FieldRequestSchema>;

/** Emitted when info is missing — the "ask once" payload. */
export const InfoRequestSchema = z.object({
  module: PersonalModuleKindSchema,
  entity_type: z.string().min(1),
  identity: z.string().min(1),
  missing_fields: z.array(FieldRequestSchema).min(1),
  reason: z.string().min(1),
  /** Always true: the system asks once, then remembers. */
  ask_once: z.boolean().default(true),
});
export type InfoRequest = z.infer<typeof InfoRequestSchema>;

/** A reused / prepared entity assembled from memory. */
export const KnownEntitySchema = z.object({
  memory_id: z.string().uuid(),
  module: PersonalModuleKindSchema,
  entity_type: z.string().min(1),
  identity: z.string().min(1),
  fields: z.record(z.unknown()).default({}),
  present_fields: z.array(z.string()).default([]),
  missing_fields: z.array(z.string()).default([]),
  last_updated: z.string().datetime().nullable().default(null),
  source: z.string().min(1),
});
export type KnownEntity = z.infer<typeof KnownEntitySchema>;

export const ResolveStatusSchema = z.enum(["reused", "partial", "missing"]);
export type ResolveStatus = z.infer<typeof ResolveStatusSchema>;

/**
 * Result of resolving an entity:
 *  - reused  : found and complete — entity is set, request is null.
 *  - partial : found but missing some required fields — both entity and request are set.
 *  - missing : not found — request is set, entity is null.
 */
export const ResolveResultSchema = z.object({
  status: ResolveStatusSchema,
  entity: KnownEntitySchema.nullable().default(null),
  request: InfoRequestSchema.nullable().default(null),
  explanation: z.string().min(1),
});
export type ResolveResult = z.infer<typeof ResolveResultSchema>;

/** Input to remember (or update) an entity — written to memory forever. */
export const RememberPersonalInputSchema = z.object({
  module: PersonalModuleKindSchema,
  entity_type: z.string().min(1),
  identity: z.string().min(1),
  fields: z.record(z.unknown()).default({}),
  keywords: z.array(z.string()).default([]),
});
export type RememberPersonalInput = z.infer<typeof RememberPersonalInputSchema>;

/** Everything known about an entity, assembled for an upcoming need (auto-prepare). */
export const PreparePackSchema = z.object({
  module: PersonalModuleKindSchema,
  entity_type: z.string().min(1),
  identity: z.string().min(1),
  /** All required fields are present. */
  ready: z.boolean(),
  entity: KnownEntitySchema.nullable().default(null),
  present_fields: z.array(z.string()).default([]),
  missing_fields: z.array(z.string()).default([]),
  /** Human-readable lines of the prepared context (the "automatically prepare everything"). */
  prepared: z.array(z.string()).default([]),
  explanation: z.string().min(1),
});
export type PreparePack = z.infer<typeof PreparePackSchema>;
