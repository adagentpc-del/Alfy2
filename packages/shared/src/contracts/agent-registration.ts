import { z } from "zod";

/**
 * An agent's registry entry (see docs/TECH_SPEC.md §3.4). The dispatcher resolves an agent key
 * to one of these and uses `endpoint` (HTTP now, queue topic later) to send Tasks.
 */

const SEMVER = /^\d+\.\d+\.\d+(?:[-+].+)?$/;

export const AgentRegistrationSchema = z.object({
  /** Dotted family.specialty key, e.g. "research.web". */
  key: z.string().regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/, "agent key must be family.specialty"),
  runtime: z.enum(["python", "typescript"]),
  /** Where the dispatcher reaches this agent (URL now; topic later). */
  endpoint: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
  version: z.string().regex(SEMVER, "version must be semver"),
});
export type AgentRegistration = z.infer<typeof AgentRegistrationSchema>;
