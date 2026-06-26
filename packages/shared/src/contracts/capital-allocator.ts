import { z } from "zod";

/**
 * Executive Capital Allocator contracts. Every day, determines the highest-value allocation of Alyssa's
 * limited resources — time, money, energy, attention, relationships, reputation, knowledge, technology,
 * assets, employees, agents, automation capacity. Answers: morning — what creates the highest return
 * today? weekly — where should we invest next? quarterly — what should we stop investing in? It never
 * optimizes one resource while unknowingly destroying another, and always explains trade-offs. See
 * docs/adr/ADR-0088-capital-allocator.md. Mirrored in workers (Pydantic).
 */

export const CapitalKindSchema = z.enum([
  "time", "money", "energy", "attention", "relationships", "reputation", "knowledge",
  "technology", "assets", "employees", "agents", "automation_capacity",
]);
export type CapitalKind = z.infer<typeof CapitalKindSchema>;

export const AllocationHorizonSchema = z.enum(["daily", "weekly", "quarterly"]);
export type AllocationHorizon = z.infer<typeof AllocationHorizonSchema>;

/** A candidate use of capital. */
export const AllocationCandidateSchema = z.object({
  label: z.string().min(1),
  /** Which capital kinds it consumes. */
  consumes: z.array(CapitalKindSchema).default([]),
  expected_return: z.number().min(0).max(1).default(0),
  leverage: z.number().min(0).max(1).default(0),
  compounding: z.number().min(0).max(1).default(0),
  strategic_value: z.number().min(0).max(1).default(0),
  founder_freedom: z.number().min(0).max(1).default(0),
  /** Which capital kinds it depletes/risks (the trade-off). */
  depletes: z.array(CapitalKindSchema).default([]),
});
export type AllocationCandidate = z.infer<typeof AllocationCandidateSchema>;

export const AllocateInputSchema = z.object({
  horizon: AllocationHorizonSchema,
  candidates: z.array(AllocationCandidateSchema).min(1),
});
export type AllocateInput = z.infer<typeof AllocateInputSchema>;

/** The allocation recommendation. */
export const AllocationPlanSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  horizon: AllocationHorizonSchema,
  /** The question answered for this horizon. */
  question: z.string().min(1),
  highest_roi: z.string().nullable().default(null),
  highest_leverage: z.string().nullable().default(null),
  highest_compounding: z.string().nullable().default(null),
  highest_strategic_value: z.string().nullable().default(null),
  highest_founder_freedom: z.string().nullable().default(null),
  recommendation: z.string().min(1),
  /** Trade-offs surfaced — what each top pick depletes. */
  tradeoffs: z.array(z.string()).default([]),
  /** For quarterly: what to stop investing in. */
  stop_investing_in: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type AllocationPlan = z.infer<typeof AllocationPlanSchema>;
