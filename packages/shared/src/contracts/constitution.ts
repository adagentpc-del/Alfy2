import { z } from "zod";

/**
 * The Constitution of Alfy² — the highest authority in the system. Every agent, workflow, automation,
 * connector, and future feature must follow these ten principles, and reference the Constitution during
 * execution. See docs/adr/ADR-0051-constitution.md. Mirrored in workers (Pydantic).
 */

/** The ten constitutional principle ids, in order. */
export const PrincipleIdSchema = z.enum([
  "human_in_command",
  "think_aggressively",
  "act_conservatively",
  "execute_with_urgency",
  "finish_what_started",
  "protect_trust",
  "optimize_measurable_outcomes",
  "reuse_before_rebuilding",
  "explain_important_decisions",
  "continuously_improve",
]);
export type PrincipleId = z.infer<typeof PrincipleIdSchema>;

/** A principle's full text. */
export const ConstitutionPrincipleSchema = z.object({
  id: PrincipleIdSchema,
  number: z.number().int().min(1).max(10),
  title: z.string().min(1),
  text: z.string().min(1),
});
export type ConstitutionPrinciple = z.infer<typeof ConstitutionPrincipleSchema>;

/** A proposed action checked against the Constitution. */
export const ConstitutionCheckInputSchema = z.object({
  description: z.string().min(1),
  /** Is the action irreversible / financial / legal / production-affecting? */
  irreversible: z.boolean().default(false),
  /** Does it already carry the appropriate human approval? */
  approved: z.boolean().default(false),
  /** Does it touch security, privacy, or a relationship? */
  touches_trust: z.boolean().default(false),
  /** Was a documented reason supplied (for abandoning approved work)? */
  abandons_approved_work: z.boolean().default(false),
  documented_reason: z.string().default(""),
  /** Does it carry an explanation / audit trail? */
  has_explanation: z.boolean().default(false),
  /** Does it improve a measurable outcome (revenue/efficiency/quality/risk)? */
  improves_outcome: z.boolean().default(false),
});
export type ConstitutionCheckInput = z.infer<typeof ConstitutionCheckInputSchema>;

/** A single principle's verdict on the action. */
export const PrincipleVerdictSchema = z.object({
  principle: PrincipleIdSchema,
  upheld: z.boolean(),
  note: z.string().min(1),
});
export type PrincipleVerdict = z.infer<typeof PrincipleVerdictSchema>;

/** The Constitution's overall verdict. */
export const ConstitutionVerdictSchema = z.object({
  compliant: z.boolean(),
  verdicts: z.array(PrincipleVerdictSchema),
  violations: z.array(PrincipleIdSchema).default([]),
  /** Whether the action must be sent for human approval before proceeding. */
  requires_approval: z.boolean(),
  summary: z.string().min(1),
});
export type ConstitutionVerdict = z.infer<typeof ConstitutionVerdictSchema>;
