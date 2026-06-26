import { z } from "zod";
import { AgentRegistrationSchema } from "./agent-registration.js";
import { DecisionCategorySchema } from "./decision.js";
import { MemoryKindSchema } from "./memory.js";

/**
 * Agent Factory contracts — Alfy2's self-extension layer. When a responsibility recurs, the factory
 * recommends a new agent; after operator approval it generates the full agent (folder, config,
 * instructions, memory scope, permissions, tools, success metrics, dashboard card, task queue, tests,
 * docs) and registers it so the orchestrator can use it immediately.
 * See docs/adr/ADR-0005-agent-factory.md. Mirrored in workers (Pydantic).
 */

const AGENT_KEY = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;
const SEMVER = /^\d+\.\d+\.\d+(?:[-+].+)?$/;

/** A declared tool the agent may use. */
export const ToolSpecSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
});
export type ToolSpec = z.infer<typeof ToolSpecSchema>;

/** What slice of memory the agent may touch (least privilege). */
export const MemoryScopeSchema = z.object({
  kinds: z.array(MemoryKindSchema).default([]),
  can_read: z.boolean().default(true),
  can_write: z.boolean().default(false),
  max_items: z.number().int().positive().default(50),
});
export type MemoryScope = z.infer<typeof MemoryScopeSchema>;

/** The agent's permission envelope. */
export const AgentPermissionsSchema = z.object({
  network: z.boolean().default(false),
  irreversible_actions: z.boolean().default(false),
  /** Capabilities that must pass through the Approval Gate before executing. */
  requires_approval_for: z.array(z.string()).default([]),
});
export type AgentPermissions = z.infer<typeof AgentPermissionsSchema>;

/** A measurable success criterion for the agent. */
export const SuccessMetricSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  target: z.string().min(1),
});
export type SuccessMetric = z.infer<typeof SuccessMetricSchema>;

/** Config for the agent's card on the operator dashboard. */
export const DashboardCardSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().default(""),
  metric_keys: z.array(z.string()).default([]),
  status: z.enum(["proposed", "active", "paused"]).default("proposed"),
});
export type DashboardCard = z.infer<typeof DashboardCardSchema>;

/** Config for the agent's task queue. */
export const TaskQueueSpecSchema = z.object({
  name: z.string().min(1),
  max_concurrency: z.number().int().positive().default(1),
  retry_limit: z.number().int().nonnegative().default(2),
});
export type TaskQueueSpec = z.infer<typeof TaskQueueSpecSchema>;

/** A file the factory will write (repo-relative path + content). */
export const GeneratedFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});
export type GeneratedFile = z.infer<typeof GeneratedFileSchema>;

/** The factory's recommendation that a new agent should exist (pre-approval). */
export const AgentRecommendationSchema = z.object({
  proposed_key: z.string().min(1),
  primary_category: DecisionCategorySchema,
  rationale: z.string().min(1),
  /** How many times the responsibility recurred in the observed window. */
  frequency: z.number().int().positive(),
  /** Decision/memory ids that evidence the recurrence. */
  evidence_refs: z.array(z.string()).default([]),
  suggested_capabilities: z.array(z.string()).default([]),
  suggested_tools: z.array(ToolSpecSchema).default([]),
  confidence: z.number().min(0).max(1),
});
export type AgentRecommendation = z.infer<typeof AgentRecommendationSchema>;

/** The approved, complete spec the factory materializes. `approved` MUST be true to generate. */
export const AgentBlueprintSchema = z.object({
  key: z.string().regex(AGENT_KEY, "key must be family.specialty"),
  runtime: z.enum(["python", "typescript"]),
  version: z.string().regex(SEMVER, "version must be semver"),
  description: z.string().min(1),
  capabilities: z.array(z.string()).min(1),
  tools: z.array(ToolSpecSchema).default([]),
  memory_scope: MemoryScopeSchema,
  permissions: AgentPermissionsSchema,
  instructions: z.string().min(1),
  success_metrics: z.array(SuccessMetricSchema).default([]),
  dashboard_card: DashboardCardSchema,
  task_queue: TaskQueueSpecSchema,
  /** Operator approval. The factory refuses to generate unless this is true. */
  approved: z.boolean().default(false),
});
export type AgentBlueprint = z.infer<typeof AgentBlueprintSchema>;

/** The materialized agent: files to write + a registration that makes it live to the orchestrator. */
export const GeneratedAgentSchema = z.object({
  registration: AgentRegistrationSchema,
  files: z.array(GeneratedFileSchema).min(1),
  dashboard_card: DashboardCardSchema,
  task_queue: TaskQueueSpecSchema,
  success_metrics: z.array(SuccessMetricSchema).default([]),
  memory_scope: MemoryScopeSchema,
  permissions: AgentPermissionsSchema,
  doc_path: z.string().min(1),
  test_path: z.string().min(1),
  summary: z.string().min(1),
  created_at: z.string().datetime(),
});
export type GeneratedAgent = z.infer<typeof GeneratedAgentSchema>;
