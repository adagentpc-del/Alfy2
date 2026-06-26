import { z } from "zod";

/**
 * Developer Command Center. Lets Alyssa see what is being built WITHOUT reading code: active builds, queued
 * build packets, coding-agent assignments, GitHub branches, open PRs, failed tests, security warnings,
 * Supabase migrations, deployment status, documentation status, approval needs, and shipped features. A
 * read-model that composes the Build Packet, Code Handoff, Implementation Review, and Ship Gate; it is
 * computed on demand and NOT persisted (like the Flight Deck). See
 * docs/adr/ADR-0140-developer-command-center.md. Mirrored in workers.
 */

/** A single build in flight. */
export const ActiveBuildSchema = z.object({
  name: z.string().min(1),
  stage: z.string().min(1),
  agent: z.string().default(""),
  branch: z.string().default(""),
  /** 0..1 progress. */
  progress: z.number().min(0).max(1).default(0),
  blocked: z.boolean().default(false),
});
export type ActiveBuild = z.infer<typeof ActiveBuildSchema>;

export const BuildCommandCenterInputSchema = z.object({
  active_builds: z.array(ActiveBuildSchema).default([]),
  queued_packets: z.array(z.string()).default([]),
  open_prs: z.array(z.string()).default([]),
  failed_tests: z.array(z.string()).default([]),
  security_warnings: z.array(z.string()).default([]),
  pending_migrations: z.array(z.string()).default([]),
  approval_needs: z.array(z.string()).default([]),
  shipped_features: z.array(z.string()).default([]),
});
export type BuildCommandCenterInput = z.infer<typeof BuildCommandCenterInputSchema>;

/** The computed developer snapshot. Read-model — not persisted. */
export const DeveloperCommandCenterSchema = z.object({
  active_builds: z.array(ActiveBuildSchema).default([]),
  queued_packets: z.array(z.string()).default([]),
  open_prs: z.array(z.string()).default([]),
  failed_tests: z.array(z.string()).default([]),
  security_warnings: z.array(z.string()).default([]),
  pending_migrations: z.array(z.string()).default([]),
  approval_needs: z.array(z.string()).default([]),
  shipped_features: z.array(z.string()).default([]),
  /** Glanceable counts. */
  active_count: z.number().int().nonnegative().default(0),
  blocked_count: z.number().int().nonnegative().default(0),
  needs_approval_count: z.number().int().nonnegative().default(0),
  /** Plain-language read of what is happening across all builds. */
  summary: z.string().min(1),
});
export type DeveloperCommandCenter = z.infer<typeof DeveloperCommandCenterSchema>;
