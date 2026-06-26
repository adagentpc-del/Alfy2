import { z } from "zod";

/**
 * Infrastructure Launch Engine. For every approved build, prepares the entire technical infrastructure so
 * Alyssa only has to add secrets, approve, and press launch. It NEVER stops because a secret is missing:
 * instead it creates placeholders, generates env files and setup instructions and terminal commands, marks
 * required manual steps clearly, and continues preparing everything else. Supports GitHub, Supabase, Render,
 * Resend, Stripe, Google/OpenAI/Anthropic APIs, DNS, storage, webhooks, cron, workers, logging, monitoring,
 * analytics. MUTABLE: prepared_pct and component statuses change as Alyssa supplies what is needed. See
 * docs/adr/ADR-0143-infra-launch.md. Mirrored in workers.
 */

export const InfraProviderSchema = z.enum([
  "github", "supabase", "render", "resend", "stripe", "google_api", "openai_api", "anthropic_api",
  "dns", "storage", "webhooks", "cron", "workers", "logging", "monitoring", "analytics",
]);
export type InfraProvider = z.infer<typeof InfraProviderSchema>;

export const InfraComponentStatusSchema = z.enum(["ready", "needs_secret", "needs_manual_step"]);
export type InfraComponentStatus = z.infer<typeof InfraComponentStatusSchema>;

/** One provider's prepared setup. */
export const InfraComponentSchema = z.object({
  provider: InfraProviderSchema,
  status: InfraComponentStatusSchema,
  setup_instructions: z.array(z.string()).default([]),
  terminal_commands: z.array(z.string()).default([]),
  env_keys: z.array(z.string()).default([]),
});
export type InfraComponent = z.infer<typeof InfraComponentSchema>;

/** A required (or optional) environment variable and where it comes from. */
export const EnvVarPlanSchema = z.object({
  key: z.string().min(1),
  source: z.string().default(""),
  optional: z.boolean().default(false),
  breaks_if_missing: z.string().default(""),
});
export type EnvVarPlan = z.infer<typeof EnvVarPlanSchema>;

/** A step only Alyssa can do, with exactly what to paste and where. */
export const ManualStepSchema = z.object({
  description: z.string().min(1),
  where: z.string().default(""),
  copy_paste_value: z.string().nullable().default(null),
  risk_level: z.enum(["low", "medium", "high"]).default("low"),
});
export type ManualStep = z.infer<typeof ManualStepSchema>;

export const PrepareInfrastructureInputSchema = z.object({
  build_packet_id: z.string().uuid(),
  providers: z.array(InfraProviderSchema).default([]),
  /** Env keys already present, so the engine can mark those components ready. */
  present_env_keys: z.array(z.string()).default([]),
});
export type PrepareInfrastructureInput = z.infer<typeof PrepareInfrastructureInputSchema>;

/** The prepared infrastructure plan. Mutable — fills in as Alyssa supplies secrets. */
export const InfrastructurePlanSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  build_packet_id: z.string().uuid(),
  components: z.array(InfraComponentSchema).default([]),
  env_required: z.array(EnvVarPlanSchema).default([]),
  manual_steps: z.array(ManualStepSchema).default([]),
  launch_checklist: z.array(z.string()).default([]),
  /** 0..1 — how much is prepared automatically (the rest is Alyssa's manual steps). */
  prepared_pct: z.number().min(0).max(1).default(0),
  /** Items still blocking a launch (missing secrets / manual steps). */
  blocking_items: z.array(z.string()).default([]),
  /** Invariant: preparation never halts on a missing secret. */
  never_blocks_on_secrets: z.literal(true).default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type InfrastructurePlan = z.infer<typeof InfrastructurePlanSchema>;
