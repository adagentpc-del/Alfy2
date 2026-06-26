import { z } from "zod";

/**
 * Agent Evaluation Lab contracts. Before any agent is trusted it is tested: test tasks, expected outputs,
 * failure cases, and risk checks, scored on accuracy, usefulness, cost, speed, and reliability. Agents are
 * promoted through stages and get NO broad permissions until they pass evaluation. See
 * docs/adr/ADR-0045-agent-evaluation-lab.md. Mirrored in workers (Pydantic).
 */

/** The promotion ladder. Broad permissions require reaching `approved` (which requires passing). */
export const AgentEvalStageSchema = z.enum([
  "draft",
  "testing",
  "limited_use",
  "approved",
  "production",
  "retired",
]);
export type AgentEvalStage = z.infer<typeof AgentEvalStageSchema>;

/** One test task with its expected output and whether it's a failure/risk probe. */
export const AgentTestCaseSchema = z.object({
  name: z.string().min(1),
  input: z.string().default(""),
  expected_output: z.string().default(""),
  /** A case the agent is expected to refuse/handle safely (not produce the "expected output"). */
  is_failure_case: z.boolean().default(false),
  /** What risk this case checks for (e.g. "spends money", "leaks PII"). */
  risk_check: z.string().default(""),
});
export type AgentTestCase = z.infer<typeof AgentTestCaseSchema>;

/** The observed result of running one test case. */
export const TestRunResultSchema = z.object({
  case_name: z.string().min(1),
  /** Did the case pass (matched expected for a normal case; safely handled for a failure case)? */
  passed: z.boolean(),
  /** Did a risk check trigger on this run? */
  risk_flagged: z.boolean().default(false),
  cost_usd: z.number().nonnegative().default(0),
  runtime_ms: z.number().nonnegative().default(0),
  /** How useful the output was, 0..1. */
  usefulness: z.number().min(0).max(1).default(0),
});
export type TestRunResult = z.infer<typeof TestRunResultSchema>;

/** The five scores, each 0..1. */
export const EvalScoresSchema = z.object({
  accuracy: z.number().min(0).max(1),
  usefulness: z.number().min(0).max(1),
  cost: z.number().min(0).max(1),
  speed: z.number().min(0).max(1),
  reliability: z.number().min(0).max(1),
});
export type EvalScores = z.infer<typeof EvalScoresSchema>;

/** An agent's evaluation record. */
export const AgentEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  agent_key: z.string().min(1),
  stage: AgentEvalStageSchema.default("draft"),
  test_cases: z.array(AgentTestCaseSchema).default([]),
  scores: EvalScoresSchema.nullable().default(null),
  /** Whether the agent passed (scores over threshold AND no risk on safe cases). */
  passed: z.boolean().default(false),
  pass_threshold: z.number().min(0).max(1).default(0.8),
  /** Broad permissions are only allowed once this is true (passed AND stage >= approved). */
  broad_permissions_allowed: z.boolean().default(false),
  notes: z.string().default(""),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type AgentEvaluation = z.infer<typeof AgentEvaluationSchema>;

export const RegisterAgentEvalInputSchema = z.object({
  agent_key: z.string().min(1),
  test_cases: z.array(AgentTestCaseSchema).min(1),
  pass_threshold: z.number().min(0).max(1).default(0.8),
});
export type RegisterAgentEvalInput = z.infer<typeof RegisterAgentEvalInputSchema>;

export const RunEvalInputSchema = z.object({
  results: z.array(TestRunResultSchema).min(1),
});
export type RunEvalInput = z.infer<typeof RunEvalInputSchema>;
