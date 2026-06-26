import { z } from "zod";

/**
 * Swarm Lab — the R&D department's bounded-swarm capability ("Swarm" tab).
 *
 * This is the one place Alfy² borrows swarm-style PARALLELISM (many agents exploring at once) WITHOUT
 * giving up the org's accountability. A swarm run is bounded: it belongs to the R&D department, must
 * be authorized by a delegation packet, is permission-scoped to draft/recommend only, and produces
 * CANDIDATES it can never execute. Top candidates are promoted into the approval-gated pipeline
 * (Build From Brainstorm / decision queue) — they never act on their own.
 *
 * Mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 */

export const SwarmModeSchema = z.enum([
  "idea_generation",
  "option_exploration",
  "research_scan",
  "red_team",
  "divergent_brainstorm",
]);
export type SwarmMode = z.infer<typeof SwarmModeSchema>;

export const SwarmRunStatusSchema = z.enum([
  "draft",
  "running",
  "converged",
  "reported",
  "promoted",
  "archived",
]);
export type SwarmRunStatus = z.infer<typeof SwarmRunStatusSchema>;

/** A swarm is bounded to non-executing scopes — it explores, it never acts. */
export const SwarmPermissionScopeSchema = z.enum(["draft_only", "recommend_only"]);
export type SwarmPermissionScope = z.infer<typeof SwarmPermissionScopeSchema>;

export const SwarmRunSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  department_key: z.string().default("research_development"),
  /** The delegation packet (from the AI Org chain of command) that authorizes this run. */
  packet_id: z.string().uuid().nullable().default(null),
  objective: z.string().min(1),
  mode: SwarmModeSchema.default("divergent_brainstorm"),
  agent_count: z.number().int().min(1).max(50).default(8),
  permission_scope: SwarmPermissionScopeSchema.default("draft_only"),
  reports_to: z.string().default("R&D Lead"),
  status: SwarmRunStatusSchema.default("draft"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type SwarmRun = z.infer<typeof SwarmRunSchema>;

export const StartSwarmRunInputSchema = z.object({
  objective: z.string().min(1),
  mode: SwarmModeSchema.default("divergent_brainstorm"),
  agent_count: z.number().int().min(1).max(50).default(8),
  business_id: z.string().uuid().optional(),
  packet_id: z.string().uuid().optional(),
  permission_scope: SwarmPermissionScopeSchema.default("draft_only"),
});
export type StartSwarmRunInput = z.infer<typeof StartSwarmRunInputSchema>;

export const SwarmCandidateSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  run_id: z.string().uuid(),
  agent_label: z.string().min(1),
  angle: z.string().default(""),
  content: z.string().default(""),
  novelty: z.number().min(0).max(1).default(0.5),
  feasibility: z.number().min(0).max(1).default(0.5),
  score: z.number().min(0).max(1).default(0),
  created_at: z.string().datetime(),
});
export type SwarmCandidate = z.infer<typeof SwarmCandidateSchema>;

export const SwarmClusterSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  run_id: z.string().uuid(),
  theme: z.string().default(""),
  candidate_ids: z.array(z.string().uuid()).default([]),
  pick: z.boolean().default(false),
  rank: z.number().int().nonnegative().default(0),
  rationale: z.string().default(""),
  created_at: z.string().datetime(),
});
export type SwarmCluster = z.infer<typeof SwarmClusterSchema>;

export const SwarmReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  run_id: z.string().uuid(),
  top_candidate_ids: z.array(z.string().uuid()).default([]),
  clusters_summary: z.string().default(""),
  recommended_next_step: z.string().default(""),
  escalated: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type SwarmReport = z.infer<typeof SwarmReportSchema>;
