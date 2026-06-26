import { z } from "zod";
import { RiskSeveritySchema } from "./idea-builder.js";

/**
 * Pattern Engine contracts. The engine observes behavioral signals over time, detects patterns and
 * bottlenecks, and recommends automations, new agents, and workflow improvements. Two invariants:
 * it is ADVISORY ONLY (never modifies behavior — `advisory_only` is always true), and EVERY
 * recommendation carries a non-empty `explanation`. See docs/adr/ADR-0009-pattern-engine.md.
 * Mirrored in workers (Pydantic).
 */

/** The behavioral dimensions the engine observes. */
export const BehaviorSignalSchema = z.enum([
  "work_session", // how I work
  "avoidance", // what I avoid
  "performance", // when I perform best
  "energy",
  "focus", // attention / deep-work quality
  "stress",
  "health", // sleep, recovery, wellbeing
  "follow_up", // follow-up habits
  "sales", // sales habits
  "launch", // launch habits
  "meeting", // meeting habits
  "calendar", // how time is allocated
  "decision", // decision patterns
  "productivity", // throughput / output
]);
export type BehaviorSignal = z.infer<typeof BehaviorSignalSchema>;

export const PatternDirectionSchema = z.enum(["positive", "negative", "neutral"]);
export type PatternDirection = z.infer<typeof PatternDirectionSchema>;

/** A single observed behavioral data point (the engine's input). */
export const BehaviorObservationSchema = z.object({
  at: z.string().datetime(),
  signal: BehaviorSignalSchema,
  /** 0..1 measure where applicable (energy, stress, performance); null otherwise. */
  measure: z.number().min(0).max(1).nullable().default(null),
  /** Free label, e.g. the activity avoided or the habit type. */
  label: z.string().default(""),
  /** Structured context, e.g. { outcome: "late", value_usd: 5000 }. */
  context: z.record(z.unknown()).default({}),
});
export type BehaviorObservation = z.infer<typeof BehaviorObservationSchema>;

/** A detected regularity in behavior. */
export const PatternSchema = z.object({
  signal: BehaviorSignalSchema,
  summary: z.string().min(1),
  direction: PatternDirectionSchema,
  /** Consistency/confidence of the pattern, 0..1. */
  strength: z.number().min(0).max(1),
  evidence_count: z.number().int().nonnegative(),
  /** The explanation of the pattern — always present. */
  detail: z.string().min(1),
});
export type Pattern = z.infer<typeof PatternSchema>;

/** A friction point worth addressing. */
export const BottleneckSchema = z.object({
  area: z.string().min(1),
  severity: RiskSeveritySchema,
  description: z.string().min(1),
  impact: z.string().min(1),
  evidence_count: z.number().int().nonnegative(),
});
export type Bottleneck = z.infer<typeof BottleneckSchema>;

/** Each recommendation type carries a required explanation. */
export const AutomationRecSchema = z.object({
  title: z.string().min(1),
  what: z.string().min(1),
  explanation: z.string().min(1),
  /** The bottleneck area this addresses, if any. */
  addresses: z.string().default(""),
});
export type AutomationRec = z.infer<typeof AutomationRecSchema>;

export const PatternAgentRecSchema = z.object({
  proposed_key: z.string().min(1),
  purpose: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
  explanation: z.string().min(1),
  addresses: z.string().default(""),
});
export type PatternAgentRec = z.infer<typeof PatternAgentRecSchema>;

export const WorkflowRecSchema = z.object({
  title: z.string().min(1),
  change: z.string().min(1),
  explanation: z.string().min(1),
  addresses: z.string().default(""),
});
export type WorkflowRec = z.infer<typeof WorkflowRecSchema>;

/** A strength the engine identifies (something Alyssa does well). */
export const StrengthSchema = z.object({
  area: z.string().min(1),
  summary: z.string().min(1),
  explanation: z.string().min(1),
  evidence_count: z.number().int().nonnegative(),
});
export type Strength = z.infer<typeof StrengthSchema>;

/** A repeating mistake (a negative outcome that recurs). */
export const RepeatingMistakeSchema = z.object({
  area: z.string().min(1),
  summary: z.string().min(1),
  explanation: z.string().min(1),
  occurrences: z.number().int().nonnegative(),
  severity: RiskSeveritySchema,
});
export type RepeatingMistake = z.infer<typeof RepeatingMistakeSchema>;

/** A successful habit (a consistent positive behavior worth reinforcing). */
export const SuccessfulHabitSchema = z.object({
  habit: z.string().min(1),
  summary: z.string().min(1),
  explanation: z.string().min(1),
  /** How consistently the habit shows up, 0..1. */
  consistency: z.number().min(0).max(1),
});
export type SuccessfulHabit = z.infer<typeof SuccessfulHabitSchema>;

/** A schedule recommendation (how to arrange time around energy/focus/calendar patterns). */
export const ScheduleRecSchema = z.object({
  title: z.string().min(1),
  change: z.string().min(1),
  explanation: z.string().min(1),
  addresses: z.string().default(""),
});
export type ScheduleRec = z.infer<typeof ScheduleRecSchema>;

export const AnalysisWindowSchema = z.object({
  from: z.string().datetime().nullable().default(null),
  to: z.string().datetime().nullable().default(null),
  observation_count: z.number().int().nonnegative(),
});
export type AnalysisWindow = z.infer<typeof AnalysisWindowSchema>;

/** The engine's output: patterns + bottlenecks + explained recommendations. Advisory only. */
export const PatternReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  generated_at: z.string().datetime(),
  window: AnalysisWindowSchema,
  patterns: z.array(PatternSchema).default([]),
  bottlenecks: z.array(BottleneckSchema).default([]),
  strengths: z.array(StrengthSchema).default([]),
  repeating_mistakes: z.array(RepeatingMistakeSchema).default([]),
  successful_habits: z.array(SuccessfulHabitSchema).default([]),
  recommended_automations: z.array(AutomationRecSchema).default([]),
  recommended_agents: z.array(PatternAgentRecSchema).default([]),
  workflow_improvements: z.array(WorkflowRecSchema).default([]),
  schedule_recommendations: z.array(ScheduleRecSchema).default([]),
  summary: z.string().min(1),
  /** Always true: the Pattern Engine recommends; it never modifies behavior automatically. */
  advisory_only: z.boolean().default(true),
});
export type PatternReport = z.infer<typeof PatternReportSchema>;
