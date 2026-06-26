import type { RepoScanInput, SecurityFinding, DimensionEval } from "@alfy2/shared";

/**
 * Deterministic evaluators for the ten dimensions. Pure functions over provided metadata — no
 * execution, no network. See docs/GITHUB_INTELLIGENCE.md.
 */

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const round2 = (n: number): number => Math.round(n * 100) / 100;

const PERMISSIVE = /\b(mit|apache|bsd|isc|unlicense)\b/i;
const COPYLEFT = /\b(gpl|agpl|lgpl|mpl)\b/i;

function severityWeight(s: SecurityFinding["severity"]): number {
  return s === "critical" ? 1 : s === "high" ? 0.6 : s === "medium" ? 0.3 : 0.1;
}

function recencyScore(lastCommit: string | null, now: Date): number {
  if (!lastCommit) return 0.3;
  const days = (now.getTime() - new Date(lastCommit).getTime()) / 86_400_000;
  if (days < 0) return 1;
  return clamp01(1 - days / 540); // ~18 months to decay to 0
}

export function evaluateDimensions(
  input: RepoScanInput,
  findings: SecurityFinding[],
  now: Date,
): DimensionEval[] {
  const docLen = input.readme.length;
  const securityPenalty = clamp01(findings.reduce((s, f) => s + severityWeight(f.severity), 0) / 2);

  const purpose = clamp01((input.description ? 0.5 : 0.2) + Math.min(0.4, docLen / 1200));
  const maturity = clamp01(
    Math.min(0.5, Math.log10(input.stars + 1) / 8) + Math.min(0.25, input.contributors / 40) + recencyScore(input.last_commit, now) * 0.25,
  );
  const architecture = clamp01(0.4 + Math.min(0.4, input.files.length / 25) + (input.files.some((f) => /^src\//.test(f.path)) ? 0.1 : 0));
  const documentation = clamp01((docLen > 200 ? 0.6 : docLen > 0 ? 0.3 : 0) + (input.files.some((f) => /readme/i.test(f.path)) ? 0.2 : 0) + (input.files.some((f) => /^docs\//.test(f.path)) ? 0.2 : 0));
  const deps = clamp01(0.9 - Math.min(0.5, input.dependencies.length / 80) - (findings.some((f) => f.category === "suspicious_dependency") ? 0.4 : 0));
  const security = clamp01(1 - securityPenalty);
  const maintenance = clamp01(recencyScore(input.last_commit, now) * 0.7 + (input.open_issues < 50 ? 0.3 : 0.1));
  const license = input.license ? (PERMISSIVE.test(input.license) ? 1 : COPYLEFT.test(input.license) ? 0.7 : 0.6) : 0.2;
  const community = clamp01(Math.min(0.6, Math.log10(input.stars + 1) / 6) + Math.min(0.4, input.forks / 200));
  // difficulty: more languages + deps + files => harder (higher score = harder)
  const difficulty = clamp01(0.2 + Math.min(0.3, input.languages.length / 8) + Math.min(0.3, input.dependencies.length / 60) + Math.min(0.2, input.files.length / 120));

  const ev = (dimension: DimensionEval["dimension"], score: number, summary: string): DimensionEval => ({
    dimension,
    score: round2(score),
    summary,
  });

  return [
    ev("project_purpose", purpose, input.description ? `Purpose: ${input.description.slice(0, 80)}` : "Purpose unclear from metadata."),
    ev("maturity", maturity, `${input.stars} stars, ${input.contributors} contributors; ${input.last_commit ? "recent activity" : "activity unknown"}.`),
    ev("architecture", architecture, `${input.files.length} files reviewed${input.files.some((f) => /^src\//.test(f.path)) ? "; src/ layout" : ""}.`),
    ev("documentation", documentation, docLen > 200 ? "README present with detail." : docLen > 0 ? "Minimal README." : "No README provided."),
    ev("dependencies", deps, `${input.dependencies.length} dependencies${findings.some((f) => f.category === "suspicious_dependency") ? "; suspicious dependency flagged" : ""}.`),
    ev("security", security, findings.length === 0 ? "No security findings." : `${findings.length} finding(s) — see security review.`),
    ev("maintenance", maintenance, `${input.open_issues} open issues; ${input.last_commit ? "maintained" : "maintenance unknown"}.`),
    ev("license", license, input.license ? `${input.license} license.` : "No license — usage rights unclear."),
    ev("community", community, `${input.stars} stars / ${input.forks} forks.`),
    ev("implementation_difficulty", difficulty, difficulty < 0.4 ? "Low — straightforward to adopt." : difficulty < 0.7 ? "Moderate integration effort." : "High — significant integration work."),
  ];
}

/** Overall quality 0..1 — mean of the positive dimensions plus inverted difficulty. */
export function overallQuality(dims: DimensionEval[]): number {
  const byKind = new Map(dims.map((d) => [d.dimension, d.score]));
  const positive = [
    "project_purpose", "maturity", "architecture", "documentation", "dependencies",
    "security", "maintenance", "license", "community",
  ] as const;
  const vals = positive.map((k) => byKind.get(k) ?? 0);
  vals.push(1 - (byKind.get("implementation_difficulty") ?? 0.5));
  return round2(vals.reduce((a, b) => a + b, 0) / vals.length);
}
