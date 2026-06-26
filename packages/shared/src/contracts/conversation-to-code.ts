import { z } from "zod";

/**
 * Conversation-to-Code Pipeline. Turns spoken ideas into shipped software safely, advancing one run through:
 * Conversation → Structured Spec → Build Packet → Security Review → Code Agent Handoff → Implementation →
 * Review → Testing → Approval → Deployment → Documentation → Compounding Asset. Every build feeds the
 * Compounding Engine — the final stage is non-negotiable. The run is MUTABLE (it advances stage by stage);
 * Voice Build Mode is the voice front-end to this same pipeline (speak → read-back → approve → Build Packet).
 * Composes Conversation, Build Packet, Ship Gate, and the Compounding Engine. See
 * docs/adr/ADR-0141-conversation-to-code.md. Mirrored in workers.
 */

export const PipelineStageSchema = z.enum([
  "conversation", "structured_spec", "build_packet", "security_review", "code_agent_handoff",
  "implementation", "review", "testing", "approval", "deployment", "documentation", "compounding_asset",
]);
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const StartPipelineInputSchema = z.object({
  idea: z.string().min(1),
  working_name: z.string().default(""),
});
export type StartPipelineInput = z.infer<typeof StartPipelineInputSchema>;

/** One stage's status in the run. */
export const PipelineStageStatusSchema = z.object({
  stage: PipelineStageSchema,
  status: z.enum(["pending", "in_progress", "complete", "blocked"]).default("pending"),
  note: z.string().default(""),
});
export type PipelineStageStatus = z.infer<typeof PipelineStageStatusSchema>;

/** A run of the conversation-to-code pipeline. Mutable — current_stage advances. */
export const ConversationToCodeRunSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  idea: z.string().min(1),
  working_name: z.string().default(""),
  current_stage: PipelineStageSchema.default("conversation"),
  stages: z.array(PipelineStageStatusSchema).default([]),
  build_packet_id: z.string().uuid().nullable().default(null),
  /** Invariant: the run is not done until it has produced a compounding asset. */
  feeds_compounding_engine: z.literal(true).default(true),
  /** No deployment stage completes without approval. */
  awaiting_approval: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ConversationToCodeRun = z.infer<typeof ConversationToCodeRunSchema>;
