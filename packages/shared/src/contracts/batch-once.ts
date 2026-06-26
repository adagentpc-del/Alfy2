import { z } from "zod";

/**
 * Batch Once Engine. Whenever Alyssa has to do a repetitive setup action, batch it, complete it once,
 * document it, and never make her repeat it unnecessarily. Detects repeated setup patterns (API keys,
 * secrets, env vars, DNS, domain verification, GitHub/Supabase/Render/Resend/Stripe setup, social accounts,
 * brand assets, email/workflow approvals) and for each: groups related tasks, creates a one-time checklist,
 * explains the manual part, generates exact copy/paste values, records where everything was added, verifies,
 * saves the process as an SOP, and reuses it in future builds. Core rule: if Alyssa has to touch it manually,
 * make it worth the touch; do not ask twice unless expired / platform changed / security rotation / different
 * business context / explicit request. MUTABLE. See docs/adr/ADR-0147-batch-once.md. Mirrored in workers.
 */

export const SetupPatternSchema = z.enum([
  "api_keys", "secrets", "env_vars", "dns_records", "domain_verification", "github_setup", "supabase_setup",
  "render_setup", "resend_setup", "stripe_setup", "social_accounts", "brand_assets", "intro_outro_uploads",
  "email_template_approvals", "workflow_approvals",
]);
export type SetupPattern = z.infer<typeof SetupPatternSchema>;

export const BatchSetupStatusSchema = z.enum(["queued", "in_progress", "verified", "reusable"]);
export type BatchSetupStatus = z.infer<typeof BatchSetupStatusSchema>;

export const DetectSetupInputSchema = z.object({
  pattern: SetupPatternSchema,
  /** The individual repeated tasks observed for this pattern. */
  tasks: z.array(z.string()).default([]),
  /** Business context — the same setup in a different context may legitimately repeat. */
  business_context: z.string().default(""),
});
export type DetectSetupInput = z.infer<typeof DetectSetupInputSchema>;

/** A batched, do-once setup sprint. Mutable — moves toward verified + reusable + saved as SOP. */
export const BatchedSetupSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  pattern: SetupPatternSchema,
  business_context: z.string().default(""),
  grouped_tasks: z.array(z.string()).default([]),
  one_time_checklist: z.array(z.string()).default([]),
  manual_explanation: z.string().default(""),
  copy_paste_values: z.array(z.string()).default([]),
  recorded_locations: z.array(z.string()).default([]),
  verified: z.boolean().default(false),
  /** Reference to the saved SOP once the process is captured for reuse. */
  sop_ref: z.string().nullable().default(null),
  reusable: z.boolean().default(false),
  status: BatchSetupStatusSchema.default("queued"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type BatchedSetup = z.infer<typeof BatchedSetupSchema>;
