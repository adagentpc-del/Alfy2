import { z } from "zod";

/**
 * A module's self-description (see docs/TECH_SPEC.md §3.3). Loaded into module_registry at boot
 * and validated against this schema; a malformed manifest fails the boot (fail fast).
 */

const SEMVER = /^\d+\.\d+\.\d+(?:[-+].+)?$/;

export const ModuleManifestSchema = z.object({
  /** Single lowercase noun, e.g. "finance". */
  id: z.string().regex(/^[a-z][a-z0-9_]*$/, "module id must be lowercase snake_case"),
  version: z.string().regex(SEMVER, "version must be semver"),
  /** Lifecycle marker; "scaffold" means declared-but-not-implemented. */
  status: z.enum(["scaffold", "active", "deprecated"]).default("scaffold"),
  description: z.string().optional(),
  /** Capabilities the module offers (snake_case verb phrases). Declared, not necessarily implemented. */
  capabilities: z.array(z.string()).default([]),
  /** Agent registry keys this module needs. */
  requires_agents: z.array(z.string()).default([]),
  /** Subset of capabilities that are irreversible — always routed through the Approval Gate. */
  irreversible_capabilities: z.array(z.string()).default([]),
  owner: z.string().min(1),
});
export type ModuleManifest = z.infer<typeof ModuleManifestSchema>;
