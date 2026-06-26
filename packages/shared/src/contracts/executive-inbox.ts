import { z } from "zod";
import { PriorityLevelSchema } from "./decision.js";
import { MemoryKindSchema } from "./memory.js";
import { FieldRequestSchema } from "./personal-os.js";

/**
 * Executive Inbox contracts — the single entry point into Alfy2. Anything can be dropped in; the
 * inbox identifies it, classifies it, routes it, links it, and enriches it so the operator never has
 * to decide where something belongs. It composes the existing engines (Decision, Memory, business
 * matching, Agent recommendations, Approval Gate). See docs/adr/ADR-0011-executive-inbox.md.
 * Mirrored in workers (Pydantic).
 */

/** What kind of thing was dropped in. */
export const InboxItemTypeSchema = z.enum([
  "voice_note",
  "screenshot",
  "pdf",
  "video",
  "photo",
  "email",
  "calendar_invite",
  "github_link",
  "url",
  "text",
  "todo_list",
  "meeting_notes",
  "idea",
  "receipt",
  "contract",
  "invoice",
  "business_card",
  "unknown",
]);
export type InboxItemType = z.infer<typeof InboxItemTypeSchema>;

/** The category the item is filed under. */
export const InboxCategorySchema = z.enum([
  "business",
  "personal",
  "finance",
  "health",
  "learning",
  "relationship",
  "legal",
  "asset",
  "technology",
  "opportunity",
  "risk",
  "task",
  "project",
  "idea",
]);
export type InboxCategory = z.infer<typeof InboxCategorySchema>;

/** A memory this item was linked to. */
export const LinkedEntitySchema = z.object({
  memory_id: z.string().uuid(),
  title: z.string().min(1),
  kind: MemoryKindSchema,
  relevance: z.number().min(0).max(1),
});
export type LinkedEntity = z.infer<typeof LinkedEntitySchema>;

/** A task the inbox suggests creating. */
export const SuggestedTaskSchema = z.object({
  title: z.string().min(1),
  due: z.string().datetime().nullable().default(null),
  priority_level: PriorityLevelSchema,
});
export type SuggestedTask = z.infer<typeof SuggestedTaskSchema>;

/** What the operator drops in. `kind` is optional — the inbox detects it if absent. */
export const InboxDropSchema = z.object({
  source: z.string().min(1),
  kind: InboxItemTypeSchema.optional(),
  /** The text/transcript/extracted content (or a description, for media). */
  content: z.string().min(1),
  /** Filenames or URLs of attachments. */
  attachments: z.array(z.string()).default([]),
  context: z.record(z.unknown()).default({}),
});
export type InboxDrop = z.infer<typeof InboxDropSchema>;

/** The fully processed inbox item — everything entering the system receives this. */
export const ProcessedInboxItemSchema = z.object({
  id: z.string().uuid(), // unique ID
  tenant_id: z.string().uuid(),
  created_at: z.string().datetime(), // timestamp
  source: z.string().min(1), // source

  item_type: InboxItemTypeSchema, // 1. identify what it is
  category: InboxCategorySchema, // 2. classify automatically
  confidence: z.number().min(0).max(1), // confidence score

  suggested_business: z.string().nullable().default(null), // 3. existing business?
  suggested_owner: z.string().min(1), // suggested owner
  urgency: z.number().min(0).max(1), // urgency
  urgency_level: PriorityLevelSchema,
  next_action: z.string().min(1), // next action

  linked_entities: z.array(LinkedEntitySchema).default([]), // 4. link to existing memories
  suggested_tasks: z.array(SuggestedTaskSchema).default([]), // 5. create tasks when appropriate
  missing_info: z.array(FieldRequestSchema).default([]), // 6. identify missing information
  recommended_agents: z.array(z.string()).default([]), // 7. recommend agents
  saved_memory_id: z.string().uuid().nullable().default(null), // 8. save reusable memory

  requires_approval: z.boolean().default(false), // 9. ask approval only when necessary
  approval_reason: z.string().default(""),
  dashboard_updated: z.boolean().default(true), // 10. update dashboards automatically

  explanation: z.string().min(1),
  summary: z.string().min(1),
});
export type ProcessedInboxItem = z.infer<typeof ProcessedInboxItemSchema>;
