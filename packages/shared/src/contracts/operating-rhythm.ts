import { z } from "zod";

/**
 * Enterprise Operating Rhythm. Defines the cadence of the company — daily, weekly, monthly, quarterly, and
 * annual reviews — and what each review must produce (lessons, decisions, assets, SOPs, new agents,
 * archived workflows, updated goals). A read-model agenda generator. See docs/adr/ADR-0118-operating-rhythm.md.
 */

export const RhythmCadenceSchema = z.enum(["daily", "weekly", "monthly", "quarterly", "annual"]);
export type RhythmCadence = z.infer<typeof RhythmCadenceSchema>;

export const BuildRhythmInputSchema = z.object({
  cadence: RhythmCadenceSchema,
  date: z.string().datetime(),
});
export type BuildRhythmInput = z.infer<typeof BuildRhythmInputSchema>;

/** What a review of this cadence should generate. */
export const RhythmOutputsSchema = z.object({
  lessons: z.boolean().default(true),
  decisions: z.boolean().default(true),
  assets: z.boolean().default(true),
  sops: z.boolean().default(true),
  new_agents: z.boolean().default(true),
  archived_workflows: z.boolean().default(true),
  updated_goals: z.boolean().default(true),
});
export type RhythmOutputs = z.infer<typeof RhythmOutputsSchema>;

/** The agenda for a cadence's review. */
export const OperatingRhythmAgendaSchema = z.object({
  cadence: RhythmCadenceSchema,
  date: z.string().datetime(),
  agenda: z.array(z.string()).default([]),
  generates: RhythmOutputsSchema,
});
export type OperatingRhythmAgenda = z.infer<typeof OperatingRhythmAgendaSchema>;
