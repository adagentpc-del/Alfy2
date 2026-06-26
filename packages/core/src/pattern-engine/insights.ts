import type {
  BehaviorObservation,
  BehaviorSignal,
  Strength,
  RepeatingMistake,
  SuccessfulHabit,
  ScheduleRec,
  RiskSeverity,
} from "@alfy2/shared";
import { timeOfDayPattern, outcomePattern } from "./analyzers.js";

/**
 * Pattern Engine v2 insight analyzers: identify strengths, repeating mistakes, and successful habits,
 * and generate schedule recommendations from energy/focus/performance/calendar/health signals. All
 * deterministic and explained (the "always explain" rule). The engine never changes behavior — these
 * are advisory only. See docs/PATTERN_ENGINE.md.
 */

const HABIT_SIGNALS: BehaviorSignal[] = ["follow_up", "sales", "launch", "meeting", "decision"];
const MEASURED_POSITIVE: BehaviorSignal[] = ["performance", "focus", "productivity", "energy", "health"];
const round2 = (n: number): number => Math.round(n * 100) / 100;

function labelOf(signal: BehaviorSignal): string {
  const map: Partial<Record<BehaviorSignal, string>> = {
    follow_up: "Follow-ups",
    sales: "Sales activities",
    launch: "Launches",
    meeting: "Meetings",
    decision: "Decisions",
    focus: "Focus",
    productivity: "Productivity",
    performance: "Performance",
    energy: "Energy",
    health: "Health",
  };
  return map[signal] ?? signal;
}

function averageMeasure(obs: BehaviorObservation[], signal: BehaviorSignal): { avg: number; n: number } {
  const m = obs.filter((o) => o.signal === signal && o.measure !== null);
  if (m.length === 0) return { avg: 0, n: 0 };
  return { avg: m.reduce((s, o) => s + (o.measure as number), 0) / m.length, n: m.length };
}

/** Things Alyssa does well: habits that reliably land, and consistently strong measured signals. */
export function detectStrengths(obs: BehaviorObservation[]): Strength[] {
  const out: Strength[] = [];
  for (const signal of HABIT_SIGNALS) {
    const r = outcomePattern(obs, signal);
    if (r && r.pattern.direction === "positive" && r.count >= 3) {
      const good = r.count - Math.round(r.badRatio * r.count);
      out.push({
        area: labelOf(signal),
        summary: `${labelOf(signal)} reliably land (${good}/${r.count} clean).`,
        explanation: `Across ${r.count} ${signal} events only ${Math.round(r.badRatio * 100)}% went sideways — a dependable strength to build on.`,
        evidence_count: r.count,
      });
    }
  }
  for (const signal of MEASURED_POSITIVE) {
    const { avg, n } = averageMeasure(obs, signal);
    if (n >= 3 && avg >= 0.7) {
      out.push({
        area: labelOf(signal),
        summary: `Consistently high ${signal} (avg ${round2(avg)}).`,
        explanation: `${n} ${signal} readings averaged ${round2(avg)} — a genuine strength worth protecting.`,
        evidence_count: n,
      });
    }
  }
  return out;
}

/** Recurring negative outcomes — the same mistake made repeatedly. */
export function detectRepeatingMistakes(obs: BehaviorObservation[]): RepeatingMistake[] {
  const out: RepeatingMistake[] = [];
  for (const signal of HABIT_SIGNALS) {
    const r = outcomePattern(obs, signal);
    if (r && r.badRatio >= 0.4) {
      const occurrences = Math.round(r.badRatio * r.count);
      const severity: RiskSeverity = r.badRatio >= 0.6 ? "high" : "medium";
      out.push({
        area: labelOf(signal),
        summary: `${labelOf(signal)} go sideways ${Math.round(r.badRatio * 100)}% of the time.`,
        explanation: `${occurrences} of ${r.count} ${signal} events had a bad outcome — a repeating mistake, not bad luck. ${
          severity === "high" ? "High severity: fix the process, not the effort." : "Worth a structural fix."
        }`,
        occurrences,
        severity,
      });
    }
  }
  return out;
}

/** Consistent positive behaviors worth reinforcing. */
export function detectSuccessfulHabits(obs: BehaviorObservation[]): SuccessfulHabit[] {
  const out: SuccessfulHabit[] = [];
  for (const signal of HABIT_SIGNALS) {
    const r = outcomePattern(obs, signal);
    if (r && r.count >= 3 && r.badRatio < 0.3) {
      const consistency = round2(1 - r.badRatio);
      out.push({
        habit: `Reliable ${labelOf(signal).toLowerCase()}`,
        summary: `${labelOf(signal)} done consistently well (${Math.round(consistency * 100)}% clean).`,
        explanation: `${r.count} ${signal} events with only ${Math.round(r.badRatio * 100)}% slippage — a successful habit. Keep the routine that produces it.`,
        consistency,
      });
    }
  }
  return out;
}

/** Schedule recommendations from energy/focus/performance peaks, stress, calendar load, and health. */
export function scheduleRecommendations(obs: BehaviorObservation[]): ScheduleRec[] {
  const out: ScheduleRec[] = [];

  // Deep-work window from the strongest measured peak.
  for (const signal of ["focus", "performance", "energy"] as BehaviorSignal[]) {
    const p = timeOfDayPattern(obs, signal);
    if (p && p.direction === "positive") {
      const bucket = p.summary.match(/in the (\w+)/)?.[1] ?? "morning";
      out.push({
        title: `Schedule deep work in the ${bucket}`,
        change: `Reserve your ${bucket} for the hardest, highest-stakes work; push admin and low-stakes calls elsewhere.`,
        explanation: p.detail,
        addresses: labelOf(signal),
      });
      break; // one deep-work recommendation is enough
    }
  }

  // Protect against the stress window.
  const stress = timeOfDayPattern(obs, "stress");
  if (stress) {
    const bucket = stress.summary.match(/in the (\w+)/)?.[1] ?? "afternoon";
    out.push({
      title: `Keep the ${bucket} lighter`,
      change: `Add a recovery block in the ${bucket} and avoid irreversible decisions then.`,
      explanation: `Stress clusters in the ${bucket} (${stress.detail}); protecting it reduces costly mistakes.`,
      addresses: "Stress",
    });
  }

  // Calendar overload → carve out focus blocks.
  const meetingByBucket = bucketCounts(obs, "meeting");
  const heaviest = topBucket(meetingByBucket);
  if (heaviest && heaviest.count >= 3) {
    out.push({
      title: "Carve out a daily focus block",
      change: `Your ${heaviest.bucket} is meeting-heavy — protect at least one no-meeting focus block each day.`,
      explanation: `${heaviest.count} meetings cluster in the ${heaviest.bucket}, crowding out deep work; a protected block restores focus time.`,
      addresses: "Calendar",
    });
  }

  // Low health readings → recovery.
  const health = averageMeasure(obs, "health");
  if (health.n >= 3 && health.avg < 0.5) {
    out.push({
      title: "Add recovery to the week",
      change: "Block recurring sleep/recovery time and treat it as non-negotiable.",
      explanation: `Health readings average ${round2(health.avg)} across ${health.n} points — low enough to drag energy and decisions; recovery is the lever.`,
      addresses: "Health",
    });
  }

  return out;
}

function bucketCounts(obs: BehaviorObservation[], signal: BehaviorSignal): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of obs) {
    if (o.signal !== signal) continue;
    const h = new Date(o.at).getUTCHours();
    const bucket = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
    m.set(bucket, (m.get(bucket) ?? 0) + 1);
  }
  return m;
}

function topBucket(m: Map<string, number>): { bucket: string; count: number } | null {
  let best: { bucket: string; count: number } | null = null;
  for (const [bucket, count] of m) {
    if (!best || count > best.count) best = { bucket, count };
  }
  return best;
}
