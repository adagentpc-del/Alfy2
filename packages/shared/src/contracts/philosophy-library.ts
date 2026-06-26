import { z } from "zod";

/**
 * Philosophy Library. Stores every principle, equation, framework, mental model, operating philosophy, and
 * insight that defines Alfy² — each with purpose, explanation, diagram, examples, relations, and revision
 * history — and surfaces one as "Today's Reminder" each day to reinforce long-term thinking. See
 * docs/adr/ADR-0123-philosophy-library.md. Mirrored in workers.
 */

export const AddPhilosophyInputSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().default(""),
  explanation: z.string().default(""),
  /** A textual/mermaid diagram description. */
  visual_diagram: z.string().default(""),
  examples: z.array(z.string()).default([]),
  related_algorithms: z.array(z.string()).default([]),
  related_agents: z.array(z.string()).default([]),
  businesses_using: z.array(z.string()).default([]),
  /** Pin as a Core Philosophy. */
  core: z.boolean().default(false),
});
export type AddPhilosophyInput = z.infer<typeof AddPhilosophyInputSchema>;

/** A stored philosophy (mutable — supports revision history + pinning). */
export const PhilosophySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  purpose: z.string().default(""),
  explanation: z.string().default(""),
  visual_diagram: z.string().default(""),
  examples: z.array(z.string()).default([]),
  related_algorithms: z.array(z.string()).default([]),
  related_agents: z.array(z.string()).default([]),
  businesses_using: z.array(z.string()).default([]),
  core: z.boolean(),
  /** Count of revisions applied. */
  revision: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Philosophy = z.infer<typeof PhilosophySchema>;

/** The deterministic daily reminder. */
export const TodaysReminderSchema = z.object({
  date: z.string().datetime(),
  philosophy_id: z.string().uuid(),
  name: z.string().min(1),
  purpose: z.string().default(""),
});
export type TodaysReminder = z.infer<typeof TodaysReminderSchema>;
