import {
  RepoScanInputSchema,
  RepoAssessmentSchema,
  AssetLibraryEntrySchema,
  type RepoScanInput,
  type RepoAssessment,
  type RepoVerdict,
  type SecurityFinding,
  type AssetLibraryEntry,
} from "@alfy2/shared";
import { scanForFindings } from "./detectors.js";
import { evaluateDimensions, overallQuality } from "./evaluate.js";
import { generateBusinessCase, type KnownBusiness } from "./businesscase.js";
import type { AssetLibrary } from "./asset-library.js";

/**
 * The GitHub Intelligence System (docs/adr/ADR-0013-github-intelligence.md).
 * Repositories are NEVER trusted automatically and NOTHING is ever executed. `scan()` statically
 * analyzes provided metadata + file content, evaluates ten dimensions, runs a security review, and
 * returns SAFE / NEEDS REVIEW / DO NOT USE. Only SAFE repos get a business case. `approve()` stores a
 * repo in the Asset Library — and refuses anything not SAFE.
 *
 * The engine has NO shell, NO eval, NO network, NO install path. `executed` is always `false`.
 */

export class RepoApprovalError extends Error {
  constructor(verdict: RepoVerdict) {
    super(`Only SAFE repositories can be approved into the Asset Library (verdict was "${verdict}").`);
    this.name = "RepoApprovalError";
  }
}

export interface GitHubIntelligenceOptions {
  clock?: () => Date;
  idFactory?: () => string;
  /** Known businesses for the "which businesses benefit" match. */
  businesses?: KnownBusiness[];
}

export interface ApproveOptions {
  approvedBy: string;
  library: AssetLibrary;
  tags?: string[];
}

function verdictFrom(findings: SecurityFinding[], input: RepoScanInput): RepoVerdict {
  if (findings.some((f) => f.severity === "critical" || f.severity === "high")) return "do_not_use";
  if (findings.some((f) => f.severity === "medium")) return "needs_review";
  if (!input.license || input.readme.length < 1) return "needs_review";
  return "safe";
}

function securitySummary(findings: SecurityFinding[]): string {
  if (findings.length === 0) {
    return "No threats detected across malicious scripts, credential harvesting, suspicious dependencies, obfuscation, network abuse, crypto mining, package vulnerabilities, or unsafe permissions.";
  }
  const bySev = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});
  const cats = [...new Set(findings.map((f) => f.category))].join(", ");
  const counts = Object.entries(bySev).map(([s, n]) => `${n} ${s}`).join(", ");
  return `${findings.length} finding(s) (${counts}) across: ${cats}.`;
}

export class GitHubIntelligence {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly businesses: KnownBusiness[];

  constructor(options: GitHubIntelligenceOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.businesses = options.businesses ?? [];
  }

  /** Statically scan a repository. NEVER executes anything. */
  scan(tenantId: string, rawInput: RepoScanInput): RepoAssessment {
    const input = RepoScanInputSchema.parse(rawInput);
    const now = this.clock();

    const findings = scanForFindings(input);
    const evaluation = evaluateDimensions(input, findings, now);
    const overall = overallQuality(evaluation);
    const verdict = verdictFrom(findings, input);

    const difficulty = evaluation.find((d) => d.dimension === "implementation_difficulty")?.score ?? 0.5;
    const business_case =
      verdict === "safe" ? generateBusinessCase(input, this.businesses, difficulty, overall) : null;

    const explanation =
      `Static scan only — nothing was executed. ` +
      (verdict === "do_not_use"
        ? "Serious security findings — DO NOT USE."
        : verdict === "needs_review"
          ? "Some concerns or missing license/docs — NEEDS REVIEW before use."
          : "Clean security review and acceptable quality — SAFE. Generated a business case.");

    return RepoAssessmentSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      url: input.url,
      name: input.name,
      scanned_at: now.toISOString(),
      verdict,
      evaluation,
      overall_quality: overall,
      security_findings: findings,
      security_summary: securitySummary(findings),
      business_case,
      executed: false,
      explanation,
    });
  }

  /** Store an approved repo in the Asset Library. Refuses anything not SAFE. */
  approve(tenantId: string, assessment: RepoAssessment, opts: ApproveOptions): AssetLibraryEntry {
    if (assessment.verdict !== "safe") throw new RepoApprovalError(assessment.verdict);
    const entry = AssetLibraryEntrySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      repo_url: assessment.url,
      name: assessment.name,
      verdict: assessment.verdict,
      assessment_id: assessment.id,
      approved_by: opts.approvedBy,
      approved_at: this.clock().toISOString(),
      tags: opts.tags ?? [],
    });
    opts.library.add(entry);
    return entry;
  }
}
