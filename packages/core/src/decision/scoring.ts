import type {
  CategoryScore,
  DecisionCategory,
  EffortBucket,
  PriorityLevel,
} from "@alfy2/shared";
import {
  URGENCY_TERMS,
  IMPORTANCE_TERMS,
  DIFFICULTY_TERMS,
  QUICK_TERMS,
  REVENUE_TERMS,
  RISK_TERMS,
  APPROVAL_TERMS,
  AUTOMATION_CUES,
  CATEGORY_AGENTS,
} from "./lexicons.js";
import { matchedTerms, clamp01 } from "./signals.js";

/**
 * Deterministic dimension scorers for the Decision Engine. Each returns a value plus the reasons
 * that produced it, so every decision is explainable. No AI. See docs/DECISION_ENGINE.md.
 */

export interface Scored {
  value: number;
  reasons: string[];
}

/** Categories that inherently raise importance. */
const HIGH_IMPORTANCE_CATEGORIES: ReadonlySet<DecisionCategory> = new Set([
  "risk",
  "finance",
  "opportunity",
  "business",
  "health",
]);

function parseAmountUsd(context: Record<string, unknown>): number | null {
  const raw = context["amount_usd"];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return null;
}

function hoursUntil(context: Record<string, unknown>, now: Date): number | null {
  const raw = context["deadline"];
  if (typeof raw !== "string") return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  return (t - now.getTime()) / 3_600_000;
}

export function scoreUrgency(blob: string, context: Record<string, unknown>, now: Date): Scored {
  const reasons: string[] = [];
  const hits = matchedTerms(blob, URGENCY_TERMS);
  let value = Math.min(0.85, hits.length * 0.3);
  if (hits.length) reasons.push(`urgency terms: ${hits.join(", ")}`);

  const h = hoursUntil(context, now);
  if (h !== null) {
    if (h <= 24) {
      value += 0.5;
      reasons.push("deadline within 24h");
    } else if (h <= 72) {
      value += 0.3;
      reasons.push("deadline within 72h");
    } else if (h <= 168) {
      value += 0.15;
      reasons.push("deadline within a week");
    }
  }
  return { value: clamp01(value), reasons };
}

export function scoreImportance(blob: string, categories: CategoryScore[]): Scored {
  const reasons: string[] = [];
  const hits = matchedTerms(blob, IMPORTANCE_TERMS);
  let value = 0.3 + hits.length * 0.2;
  if (hits.length) reasons.push(`importance terms: ${hits.join(", ")}`);

  const elevating = categories.filter((c) => HIGH_IMPORTANCE_CATEGORIES.has(c.category));
  if (elevating.length) {
    value += 0.15 * elevating.length;
    reasons.push(`category weight: ${elevating.map((c) => c.category).join(", ")}`);
  }
  return { value: clamp01(value), reasons };
}

export function scoreDifficulty(blob: string): Scored {
  const reasons: string[] = [];
  const hard = matchedTerms(blob, DIFFICULTY_TERMS);
  const quick = matchedTerms(blob, QUICK_TERMS);
  let value = 0.3 + hard.length * 0.2 - quick.length * 0.2;
  if (blob.length > 240) value += 0.1; // long, detailed asks tend to be harder
  if (hard.length) reasons.push(`difficulty terms: ${hard.join(", ")}`);
  if (quick.length) reasons.push(`simplicity terms: ${quick.join(", ")}`);
  return { value: clamp01(value), reasons };
}

export function estimateEffort(
  difficulty: number,
  blob: string,
): { minutes: number; bucket: EffortBucket; reasons: string[] } {
  const reasons: string[] = [];
  let minutes = Math.round(15 + difficulty * 225); // 15..240 by difficulty
  if (matchedTerms(blob, QUICK_TERMS).length) {
    minutes = Math.min(minutes, 15);
    reasons.push("flagged as quick/simple");
  }
  const bucket: EffortBucket =
    minutes <= 15 ? "trivial" : minutes <= 60 ? "small" : minutes <= 180 ? "medium" : minutes <= 480 ? "large" : "xlarge";
  reasons.push(`estimated ~${minutes} min (${bucket})`);
  return { minutes, bucket, reasons };
}

export function scoreRevenue(blob: string, context: Record<string, unknown>): Scored {
  const reasons: string[] = [];
  const hits = matchedTerms(blob, REVENUE_TERMS);
  let value = hits.length * 0.2;
  if (hits.length) reasons.push(`revenue terms: ${hits.join(", ")}`);

  const amount = parseAmountUsd(context);
  if (amount !== null && amount > 0) {
    const bump = amount >= 10_000 ? 0.4 : amount >= 1_000 ? 0.25 : 0.1;
    value += bump;
    reasons.push(`context.amount_usd=${amount} raised revenue impact`);
  }
  return { value: clamp01(value), reasons };
}

export function scoreRisk(blob: string, context: Record<string, unknown>): Scored {
  const reasons: string[] = [];
  const hits = matchedTerms(blob, RISK_TERMS);
  let value = hits.length * 0.2;
  if (hits.length) reasons.push(`risk terms: ${hits.join(", ")}`);
  if (context["irreversible"] === true) {
    value += 0.4;
    reasons.push("context flagged irreversible");
  }
  return { value: clamp01(value), reasons };
}

/** Operator approval required for irreversible / financial / high-risk items. */
export function requiredApprovals(
  blob: string,
  revenueImpact: number,
  risk: number,
  context: Record<string, unknown>,
): { approvals: string[]; reasons: string[] } {
  const reasons: string[] = [];
  const approvalHits = matchedTerms(blob, APPROVAL_TERMS);
  const needs =
    approvalHits.length > 0 ||
    risk >= 0.6 ||
    revenueImpact >= 0.7 ||
    context["irreversible"] === true;
  if (needs) {
    if (approvalHits.length) reasons.push(`approval-trigger terms: ${approvalHits.join(", ")}`);
    if (risk >= 0.6) reasons.push("high risk requires approval");
    if (revenueImpact >= 0.7) reasons.push("high revenue impact requires approval");
    return { approvals: ["operator"], reasons };
  }
  return { approvals: [], reasons };
}

export function recommendAgents(categories: CategoryScore[]): string[] {
  const out: string[] = [];
  for (const { category } of categories) {
    for (const key of CATEGORY_AGENTS[category]) {
      if (!out.includes(key)) out.push(key);
    }
  }
  return out.slice(0, 4);
}

export function recommendDeadline(urgency: number, now: Date): { iso: string; days: number } {
  const days = urgency >= 0.85 ? 1 : urgency >= 0.6 ? 3 : urgency >= 0.35 ? 7 : 21;
  const iso = new Date(now.getTime() + days * 86_400_000).toISOString();
  return { iso, days };
}

export function automationOpportunities(blob: string): string[] {
  const out: string[] = [];
  for (const cue of AUTOMATION_CUES) {
    if (matchedTerms(blob, cue.terms).length > 0 && !out.includes(cue.suggestion)) {
      out.push(cue.suggestion);
    }
  }
  return out;
}

export interface PriorityWeights {
  urgency: number;
  importance: number;
  revenue: number;
  risk: number;
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  urgency: 0.35,
  importance: 0.3,
  revenue: 0.2,
  risk: 0.15,
};

export function priority(
  dims: { urgency: number; importance: number; revenue_impact: number; risk: number },
  weights: PriorityWeights,
): { score: number; level: PriorityLevel } {
  let score =
    weights.urgency * dims.urgency +
    weights.importance * dims.importance +
    weights.revenue * dims.revenue_impact +
    weights.risk * dims.risk;
  // A genuine emergency or a severe risk should never read as low priority.
  if (dims.urgency >= 0.85 || dims.risk >= 0.8) score = Math.max(score, 0.75);
  score = clamp01(score);
  const level: PriorityLevel =
    score >= 0.75 ? "critical" : score >= 0.5 ? "high" : score >= 0.25 ? "medium" : "low";
  return { score, level };
}
