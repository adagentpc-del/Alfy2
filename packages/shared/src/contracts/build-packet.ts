import { z } from "zod";

/**
 * Build Packet Generator (and the artifact of Architect-to-Builder Mode). Turns an approved idea into a
 * single structured packet a coding agent (Claude Code, Codex, etc.) can implement WITHOUT Alyssa repeating
 * herself: what/why, user problem, business value, the 15 architecture artifacts (exec summary, PRD, user
 * stories, technical architecture, database schema, Supabase table plan, API routes, frontend components,
 * agent requirements, security requirements, approval rules, implementation sequence, testing plan,
 * deployment plan, and the final coding-agent build prompt), plus the explicit separations (what can build
 * now / needs clarification / should wait / requires approval / requires security review). MUTABLE: a packet
 * moves draft → in_review → approved → sent → archived. Nothing is built until it is approved. See
 * docs/adr/ADR-0135-build-packet.md. Mirrored in workers.
 */

export const BuildPacketStatusSchema = z.enum(["draft", "in_review", "approved", "sent", "archived"]);
export type BuildPacketStatus = z.infer<typeof BuildPacketStatusSchema>;

/** A user story in the standard form. */
export const UserStorySchema = z.object({
  as_a: z.string().min(1),
  i_want: z.string().min(1),
  so_that: z.string().min(1),
  acceptance: z.array(z.string()).default([]),
});
export type UserStory = z.infer<typeof UserStorySchema>;

/** The Architect-to-Builder triage: where each item belongs before any code is written. */
export const BuildTriageSchema = z.object({
  build_now: z.array(z.string()).default([]),
  needs_clarification: z.array(z.string()).default([]),
  should_wait: z.array(z.string()).default([]),
  requires_approval: z.array(z.string()).default([]),
  requires_security_review: z.array(z.string()).default([]),
});
export type BuildTriage = z.infer<typeof BuildTriageSchema>;

export const GenerateBuildPacketInputSchema = z.object({
  /** The raw idea / transcript Alyssa spoke through (15–60 min conversations welcome). */
  source: z.string().min(1),
  working_name: z.string().default(""),
});
export type GenerateBuildPacketInput = z.infer<typeof GenerateBuildPacketInputSchema>;

/** The full Build Packet. Mutable (status + content evolve through review). */
export const BuildPacketSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  working_name: z.string().default(""),
  status: BuildPacketStatusSchema.default("draft"),

  // What & why
  what_we_are_building: z.string().default(""),
  why_we_are_building_it: z.string().default(""),
  user_problem: z.string().default(""),
  business_value: z.string().default(""),

  // The 15 Architect-to-Builder artifacts
  executive_summary: z.string().default(""),
  prd: z.string().default(""),
  user_stories: z.array(UserStorySchema).default([]),
  technical_architecture: z.string().default(""),
  database_schema: z.string().default(""),
  supabase_table_plan: z.string().default(""),
  api_routes: z.array(z.string()).default([]),
  frontend_components: z.array(z.string()).default([]),
  agent_requirements: z.array(z.string()).default([]),
  security_requirements: z.array(z.string()).default([]),
  approval_rules: z.array(z.string()).default([]),
  implementation_sequence: z.array(z.string()).default([]),
  testing_plan: z.string().default(""),
  deployment_plan: z.string().default(""),
  /** The copy-paste-ready prompt for the coding agent. */
  coding_agent_build_prompt: z.string().default(""),

  // Build Packet Generator extras
  required_screens: z.array(z.string()).default([]),
  required_backend: z.array(z.string()).default([]),
  required_database_tables: z.array(z.string()).default([]),
  required_integrations: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  acceptance_criteria: z.array(z.string()).default([]),
  launch_checklist: z.array(z.string()).default([]),

  triage: BuildTriageSchema,

  /** Always true until explicit approval — nothing is built from a draft. */
  awaiting_approval: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type BuildPacket = z.infer<typeof BuildPacketSchema>;
