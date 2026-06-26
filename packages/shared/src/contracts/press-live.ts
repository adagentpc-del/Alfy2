import { z } from "zod";

/**
 * Press Live Mode. Turns prepared infrastructure into a live deployed system AFTER final approval. Before
 * launch it verifies: GitHub branch clean, required env vars exist, no secrets committed, migrations ready,
 * RLS enabled, hosting config ready, email sender/domain ready, webhooks configured, tests pass, health
 * checks pass, rollback exists, audit logging enabled. If anything is missing it never fails silently — it
 * shows the exact item, where Alyssa gets it, and where to paste it, and keeps checking everything else.
 * Outcome is one of READY_TO_LAUNCH / BLOCKED_BY_SECRETS / BLOCKED_BY_CONFIG / BLOCKED_BY_TEST_FAILURE / LIVE.
 * Each run is APPEND-ONLY. See docs/adr/ADR-0144-press-live.md. Mirrored in workers.
 */

export const PreLaunchCheckKindSchema = z.enum([
  "branch_clean", "env_vars_present", "no_secrets_committed", "migrations_ready", "rls_enabled",
  "hosting_config_ready", "email_domain_ready", "webhooks_configured", "tests_pass", "health_checks_pass",
  "rollback_exists", "audit_logging_enabled",
]);
export type PreLaunchCheckKind = z.infer<typeof PreLaunchCheckKindSchema>;

/** One pre-launch check; when failed it carries exactly what Alyssa must supply and where. */
export const PreLaunchCheckSchema = z.object({
  kind: PreLaunchCheckKindSchema,
  passed: z.boolean(),
  /** Category of failure, drives the outcome bucket. */
  failure_kind: z.enum(["none", "secret", "config", "test"]).default("none"),
  missing_item: z.string().default(""),
  where_to_get: z.string().default(""),
  where_to_paste: z.string().default(""),
});
export type PreLaunchCheck = z.infer<typeof PreLaunchCheckSchema>;

export const PressLiveOutcomeSchema = z.enum([
  "ready_to_launch", "blocked_by_secrets", "blocked_by_config", "blocked_by_test_failure", "live",
]);
export type PressLiveOutcome = z.infer<typeof PressLiveOutcomeSchema>;

export const RunPressLiveInputSchema = z.object({
  build_packet_id: z.string().uuid().nullable().default(null),
  checks: z.array(PreLaunchCheckSchema).default([]),
  /** Alyssa's final launch approval. Without it, the best outcome is ready_to_launch, never live. */
  alyssa_approved: z.boolean().default(false),
});
export type RunPressLiveInput = z.infer<typeof RunPressLiveInputSchema>;

/** One Press Live run. Append-only. */
export const PressLiveEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  build_packet_id: z.string().uuid().nullable().default(null),
  checks: z.array(PreLaunchCheckSchema).default([]),
  outcome: PressLiveOutcomeSchema,
  /** The failed checks by kind, with their supply instructions intact. */
  blocking: z.array(PreLaunchCheckSchema).default([]),
  created_at: z.string().datetime(),
});
export type PressLiveEvaluation = z.infer<typeof PressLiveEvaluationSchema>;
