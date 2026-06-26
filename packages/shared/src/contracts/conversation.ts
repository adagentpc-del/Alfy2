import { z } from "zod";

/**
 * Conversation Engine. Alfy² as a thinking partner, not a command processor. When Alyssa speaks naturally,
 * it listens, asks clarifying questions, connects to existing knowledge, identifies opportunities,
 * respectfully challenges assumptions, generates options, detects patterns, remembers conclusions — and
 * quietly converts the conversation into tasks, assets, agents, businesses, workflows, knowledge, and
 * capital. Natural conversation is the primary interface. See docs/adr/ADR-0124-conversation.md.
 */

export const ConversationOutputKindSchema = z.enum([
  "task", "asset", "agent", "business", "workflow", "knowledge", "capital",
  // Conversation-to-Reality outputs
  "goal", "project", "business_plan", "dashboard_item", "approval_request", "sop", "campaign",
]);
export type ConversationOutputKind = z.infer<typeof ConversationOutputKindSchema>;

/**
 * What a stretch of natural speech is ABOUT — detected before it is converted into outputs. Alyssa never
 * needs structured prompts; the engine classifies the utterance into one or more of these, then routes to
 * the matching ConversationOutputKind(s).
 */
export const ConversationInputCategorySchema = z.enum([
  "idea", "task", "goal", "asset", "business_opportunity", "concern", "relationship_note",
  "financial_note", "health_note", "content_idea", "podcast_idea", "system_improvement",
]);
export type ConversationInputCategory = z.infer<typeof ConversationInputCategorySchema>;

export const ProcessConversationInputSchema = z.object({
  utterance: z.string().min(1),
  /** Known entities/topics in the knowledge graph, for connection. */
  known_topics: z.array(z.string()).default([]),
});
export type ProcessConversationInput = z.infer<typeof ProcessConversationInputSchema>;

/** One thing the conversation should become. */
export const ConversationOutputSchema = z.object({
  kind: ConversationOutputKindSchema,
  description: z.string().min(1),
});
export type ConversationOutput = z.infer<typeof ConversationOutputSchema>;

/** What Alfy² extracted from a natural utterance. */
export const ConversationExtractionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  utterance: z.string().min(1),
  /** What the utterance is about — one or more detected categories (empty when unclear). */
  input_categories: z.array(ConversationInputCategorySchema).default([]),
  /** Clarifying questions to ask before acting (empty when clear). */
  clarifying_questions: z.array(z.string()).default([]),
  /** Connections to existing knowledge. */
  connections: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  /** Assumptions worth challenging, respectfully. */
  challenged_assumptions: z.array(z.string()).default([]),
  options: z.array(z.string()).default([]),
  patterns: z.array(z.string()).default([]),
  /** The remembered conclusion (empty if none reached yet). */
  conclusion: z.string().default(""),
  /** What the conversation should be built into — nothing executes without approval. */
  outputs: z.array(ConversationOutputSchema).default([]),
  created_at: z.string().datetime(),
});
export type ConversationExtraction = z.infer<typeof ConversationExtractionSchema>;
