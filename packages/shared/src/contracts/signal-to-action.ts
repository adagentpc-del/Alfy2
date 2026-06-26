import { z } from "zod";

/**
 * The universal explainable output envelope.
 * Every agent and every module action returns this shape. `explanation` is always present
 * and non-empty — no action exists in Alfy2 without a rationale (see docs/CODING_STANDARDS.md §2).
 */

export const EvidenceSchema = z.object({
  /** Human-or-machine-readable source identifier (e.g. "events:uuid", "url", "memory:key"). */
  source: z.string().min(1),
  /** Optional pointer within the source (row id, anchor, line, etc.). */
  ref: z.string().optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const ActionSchema = z.object({
  /** Short, operator-facing label for the proposed action. */
  label: z.string().min(1),
  /** If false, the action is irreversible and MUST pass through the Approval Gate. */
  reversible: z.boolean(),
  /** Capability-specific payload the dispatcher would execute. */
  payload: z.record(z.unknown()).default({}),
});
export type Action = z.infer<typeof ActionSchema>;

export const SignalToActionSchema = z.object({
  /** The observed signal — what changed. */
  what_changed: z.string().min(1),
  /** Interpreted significance — why it matters. */
  why_it_matters: z.string().min(1),
  /** Proposed next actions (each carries its own reversibility). */
  next_actions: z.array(ActionSchema).default([]),
  /** Confidence in the assessment, 0..1. */
  confidence: z.number().min(0).max(1),
  /** Supporting evidence/source references. */
  evidence: z.array(EvidenceSchema).default([]),
  /** Plain-language rationale. ALWAYS present and non-empty. */
  explanation: z.string().min(1),
});
export type SignalToAction = z.infer<typeof SignalToActionSchema>;
