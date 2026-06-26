import { z } from "zod";

/**
 * Never Again Engine. When Alyssa signals a repeated frustration ("I forgot", "this happened again", "I
 * hate doing this", "this always breaks", "this wastes time"), it turns that frustration into permanent
 * infrastructure — root cause plus a workflow, automation, agent, checklist, SOP, reminder, knowledge
 * update, and policy. Nothing should annoy Alyssa twice. See docs/adr/ADR-0116-never-again.md.
 */

export const FrustrationTriggerSchema = z.enum([
  "i_forgot", "happened_again", "annoying", "i_hate_this", "always_breaks", "wastes_time",
]);
export type FrustrationTrigger = z.infer<typeof FrustrationTriggerSchema>;

export const CaptureFrustrationInputSchema = z.object({
  trigger: FrustrationTriggerSchema,
  description: z.string().min(1),
  /** How many times it has recurred (drives priority). */
  occurrences: z.number().int().positive().default(1),
  business_id: z.string().uuid().nullable().default(null),
});
export type CaptureFrustrationInput = z.infer<typeof CaptureFrustrationInputSchema>;

/** The permanent solution generated from a frustration. */
export const NeverAgainSolutionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  trigger: FrustrationTriggerSchema,
  problem: z.string().min(1),
  root_cause: z.string().min(1),
  permanent_solution: z.string().min(1),
  workflow: z.string().default(""),
  automation: z.string().default(""),
  agent: z.string().default(""),
  checklist: z.array(z.string()).default([]),
  sop: z.string().default(""),
  reminder: z.string().default(""),
  knowledge_update: z.string().default(""),
  policy: z.string().default(""),
  /** 0..1 — priority (rises with occurrences). */
  priority: z.number().min(0).max(1),
  created_at: z.string().datetime(),
});
export type NeverAgainSolution = z.infer<typeof NeverAgainSolutionSchema>;
