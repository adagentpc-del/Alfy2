import { z } from "zod";
import { EffortBucketSchema } from "./decision.js";
import { AgentNeedSchema, LaunchPhaseSchema } from "./idea-builder.js";

/**
 * GitHub Intelligence contracts. Repositories are NEVER trusted automatically and NOTHING is ever
 * executed. The system statically scans provided repo metadata + file content, evaluates ten
 * dimensions, runs a security review, and returns SAFE / NEEDS REVIEW / DO NOT USE. Only safe repos
 * get a business case, and approved repos are stored in the Asset Library. The `executed` field is a
 * literal `false` so "did not execute" is part of the contract.
 * See docs/adr/ADR-0013-github-intelligence.md. Mirrored in workers (Pydantic).
 */

export const RepoVerdictSchema = z.enum(["safe", "needs_review", "do_not_use"]);
export type RepoVerdict = z.infer<typeof RepoVerdictSchema>;

/** The ten evaluation dimensions. */
export const DimensionKindSchema = z.enum([
  "project_purpose",
  "maturity",
  "architecture",
  "documentation",
  "dependencies",
  "security",
  "maintenance",
  "license",
  "community",
  "implementation_difficulty",
]);
export type DimensionKind = z.infer<typeof DimensionKindSchema>;

export const DimensionEvalSchema = z.object({
  dimension: DimensionKindSchema,
  /** 0..1; for implementation_difficulty, higher = harder. */
  score: z.number().min(0).max(1),
  summary: z.string().min(1),
});
export type DimensionEval = z.infer<typeof DimensionEvalSchema>;

/** Security review. */
export const FindingSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const SecurityCategorySchema = z.enum([
  "malicious_script",
  "credential_harvesting",
  "suspicious_dependency",
  "obfuscated_code",
  "network_abuse",
  "crypto_mining",
  "package_vulnerability",
  "unsafe_permissions",
]);
export type SecurityCategory = z.infer<typeof SecurityCategorySchema>;

export const SecurityFindingSchema = z.object({
  category: SecurityCategorySchema,
  severity: FindingSeveritySchema,
  /** Where it was found (path + matched snippet). */
  evidence: z.string().min(1),
  description: z.string().min(1),
});
export type SecurityFinding = z.infer<typeof SecurityFindingSchema>;

/** A file the caller provides for static analysis. NEVER executed. */
export const FileEntrySchema = z.object({
  path: z.string().min(1),
  content: z.string().default(""),
});
export type FileEntry = z.infer<typeof FileEntrySchema>;

/** Everything the scanner needs — provided by the caller; the engine fetches/runs nothing. */
export const RepoScanInputSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
  owner: z.string().default(""),
  description: z.string().default(""),
  readme: z.string().default(""),
  license: z.string().nullable().default(null),
  languages: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  files: z.array(FileEntrySchema).default([]),
  stars: z.number().int().nonnegative().default(0),
  forks: z.number().int().nonnegative().default(0),
  open_issues: z.number().int().nonnegative().default(0),
  contributors: z.number().int().nonnegative().default(0),
  last_commit: z.string().datetime().nullable().default(null),
});
export type RepoScanInput = z.infer<typeof RepoScanInputSchema>;

/** Generated only when the verdict is SAFE. */
export const RoiLevelSchema = z.enum(["low", "medium", "high"]);
export type RoiLevel = z.infer<typeof RoiLevelSchema>;

export const BusinessCaseSchema = z.object({
  business_applications: z.array(z.string()).min(1),
  which_businesses: z.array(z.string()).default([]),
  implementation_roadmap: z.array(LaunchPhaseSchema).min(1),
  required_agents: z.array(AgentNeedSchema).default([]),
  estimated_effort: EffortBucketSchema,
  estimated_effort_hours: z.number().int().nonnegative(),
  estimated_roi: z.string().min(1),
  roi_level: RoiLevelSchema,
});
export type BusinessCase = z.infer<typeof BusinessCaseSchema>;

/** The full assessment. */
export const RepoAssessmentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  url: z.string().min(1),
  name: z.string().min(1),
  scanned_at: z.string().datetime(),
  verdict: RepoVerdictSchema,
  evaluation: z.array(DimensionEvalSchema).min(1),
  overall_quality: z.number().min(0).max(1),
  security_findings: z.array(SecurityFindingSchema).default([]),
  security_summary: z.string().min(1),
  /** Null unless the verdict is SAFE. */
  business_case: BusinessCaseSchema.nullable().default(null),
  /** ALWAYS false — the system never executes anything. */
  executed: z.literal(false),
  explanation: z.string().min(1),
});
export type RepoAssessment = z.infer<typeof RepoAssessmentSchema>;

/** A repository approved and stored in the Asset Library. */
export const AssetLibraryEntrySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  repo_url: z.string().min(1),
  name: z.string().min(1),
  verdict: RepoVerdictSchema,
  assessment_id: z.string().uuid(),
  approved_by: z.string().min(1),
  approved_at: z.string().datetime(),
  tags: z.array(z.string()).default([]),
});
export type AssetLibraryEntry = z.infer<typeof AssetLibraryEntrySchema>;
