import { z } from "zod";

/**
 * Code Execution Handoff. A safe handoff from Alfy² planning to coding agents. For every APPROVED Build
 * Packet it produces the plan a coding agent needs: GitHub branch plan, file plan, implementation prompt,
 * acceptance criteria, tests, rollback plan, security checks, database migration plan, Supabase config, and
 * deployment checklist. The rule is fixed: Claude Code may build, Alfy² must review, Alyssa approves — no
 * code is merged, deployed, or connected to production without approval. Each handoff is an APPEND-ONLY
 * record (the plan as generated). See docs/adr/ADR-0136-code-handoff.md. Mirrored in workers.
 */

export const GenerateHandoffInputSchema = z.object({
  build_packet_id: z.string().uuid(),
  /** Handoff requires an approved packet; the engine refuses otherwise. */
  packet_approved: z.boolean(),
});
export type GenerateHandoffInput = z.infer<typeof GenerateHandoffInputSchema>;

/** A planned file change (no code is written here — this is the plan). */
export const FilePlanEntrySchema = z.object({
  path: z.string().min(1),
  action: z.enum(["create", "modify", "delete"]),
  purpose: z.string().default(""),
});
export type FilePlanEntry = z.infer<typeof FilePlanEntrySchema>;

/** The handoff plan for one approved Build Packet. Append-only. */
export const CodeHandoffSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  build_packet_id: z.string().uuid(),
  branch_plan: z.string().min(1),
  file_plan: z.array(FilePlanEntrySchema).default([]),
  implementation_prompt: z.string().default(""),
  acceptance_criteria: z.array(z.string()).default([]),
  tests: z.array(z.string()).default([]),
  rollback_plan: z.string().default(""),
  security_checks: z.array(z.string()).default([]),
  database_migration_plan: z.string().default(""),
  supabase_configuration: z.string().default(""),
  deployment_checklist: z.array(z.string()).default([]),
  /** Invariant: build is permitted, but merge/deploy/production requires Alyssa's approval. */
  production_requires_approval: z.literal(true).default(true),
  created_at: z.string().datetime(),
});
export type CodeHandoff = z.infer<typeof CodeHandoffSchema>;
