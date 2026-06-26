import type {
  BehaviorObservation,
  BehaviorSignal,
  Pattern,
  Bottleneck,
  RiskSeverity,
} from "@alfy2/shared";

/**
 * Deterministic analyzers for the Pattern Engine. They turn a window of behavioral observations into
 * patterns and bottlenecks — no AI, every result carries its evidence count and a plain-language
 * detail (the "always explain" rule). See docs/PATTERN_ENGINE.md.
 */

const round2 = (n: number): number => Math.round(n * 100) / 100;

type Bucket = "morning" | "afternoon" | "evening";
function bucketOf(iso: string): Bucket {
  const h = new Date(iso).getUTCHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

/** Average measure by time-of-day for a measured signal (performance/energy). */
export function timeOfDayPattern(
  obs: BehaviorObservation[],
  signal: BehaviorSignal,
): Pattern | null {
  const measured = obs.filter((o) => o.signal === signal && o.measure !== null);
  if (measured.length < 3) return null;

  const sums: Record<Bucket, { total: number; n: number }> = {
    morning: { total: 0, n: 0 },
    afternoon: { total: 0, n: 0 },
    evening: { total: 0, n: 0 },
  };
  for (const o of measured) {
    const b = bucketOf(o.at);
    sums[b].total += o.measure as number;
    sums[b].n += 1;
  }
  const avgs = (Object.entries(sums) as Array<[Bucket, { total: number; n: number }]>)
    .filter(([, v]) => v.n > 0)
    .map(([b, v]) => ({ bucket: b, avg: v.total / v.n }));
  if (avgs.length < 2) return null;

  avgs.sort((a, b) => b.avg - a.avg);
  const best = avgs[0]!;
  const worst = avgs[avgs.length - 1]!;
  const gap = best.avg - worst.avg;
  const noun = signal === "performance" ? "Performs best" : `Highest ${signal}`;
  return {
    signal,
    summary: `${noun} in the ${best.bucket} (avg ${round2(best.avg)}) vs ${worst.bucket} (avg ${round2(worst.avg)}).`,
    direction: gap >= 0.15 ? "positive" : "neutral",
    strength: Math.min(1, gap * 2),
    evidence_count: measured.length,
    detail: `Across ${measured.length} ${signal} data points, the ${best.bucket} averaged ${round2(best.avg)} against ${round2(worst.avg)} in the ${worst.bucket}. Align the hardest work with your ${best.bucket} peak.`,
  };
}

/** Bad-outcome ratio for a habit signal (follow_up/sales/launch/meeting/decision). */
const BAD_OUTCOMES = new Set(["late", "missed", "skipped", "overran", "reversed", "delayed"]);

export function outcomePattern(
  obs: BehaviorObservation[],
  signal: BehaviorSignal,
): { pattern: Pattern; badRatio: number; count: number } | null {
  const withOutcome = obs.filter(
    (o) => o.signal === signal && typeof o.context["outcome"] === "string",
  );
  if (withOutcome.length < 3) return null;
  const bad = withOutcome.filter((o) => BAD_OUTCOMES.has(String(o.context["outcome"]))).length;
  const badRatio = bad / withOutcome.length;
  const direction = badRatio >= 0.4 ? "negative" : "positive";
  return {
    pattern: {
      signal,
      summary: `${label(signal)} go sideways ${Math.round(badRatio * 100)}% of the time.`,
      direction,
      strength: Math.min(1, Math.abs(badRatio - 0.2) * 1.5),
      evidence_count: withOutcome.length,
      detail: `${bad} of ${withOutcome.length} ${signal} events had a bad outcome (late/missed/overran). ${
        direction === "negative" ? "This is a recurring drop-off worth fixing." : "This is healthy — keep it up."
      }`,
    },
    badRatio,
    count: withOutcome.length,
  };
}

/** Repeated avoidance of the same kind of work. */
export function avoidancePatterns(obs: BehaviorObservation[]): Pattern[] {
  const counts = new Map<string, number>();
  for (const o of obs) {
    if (o.signal !== "avoidance") continue;
    const key = o.label || "unspecified work";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: Pattern[] = [];
  for (const [key, n] of counts) {
    if (n < 3) continue;
    out.push({
      signal: "avoidance",
      summary: `Consistently avoids: ${key} (${n}×).`,
      direction: "negative",
      strength: Math.min(1, n / 6),
      evidence_count: n,
      detail: `"${key}" was put off ${n} times in the window — a stable avoidance pattern, not a one-off.`,
    });
  }
  return out;
}

/** Stress that clusters at a time of day. */
export function stressPattern(obs: BehaviorObservation[]): Pattern | null {
  const p = timeOfDayPattern(obs, "stress");
  if (!p) return null;
  // For stress, "highest" is a negative signal.
  return { ...p, direction: p.strength >= 0.3 ? "negative" : "neutral" };
}

// --- bottleneck derivation ---

export function bottlenecksFrom(
  obs: BehaviorObservation[],
): { bottlenecks: Bottleneck[]; signals: Set<BehaviorSignal> } {
  const bottlenecks: Bottleneck[] = [];
  const signals = new Set<BehaviorSignal>();

  for (const signal of ["follow_up", "sales", "launch", "meeting", "decision"] as BehaviorSignal[]) {
    const r = outcomePattern(obs, signal);
    if (r && r.badRatio >= 0.4) {
      const severity: RiskSeverity = r.badRatio >= 0.6 ? "high" : "medium";
      bottlenecks.push({
        area: label(signal),
        severity,
        description: `${label(signal)} consistently go off-track (${Math.round(r.badRatio * 100)}% bad outcomes).`,
        impact: impactOf(signal),
        evidence_count: r.count,
      });
      signals.add(signal);
    }
  }

  for (const p of avoidancePatterns(obs)) {
    const isSales = /outreach|sales|cold|pitch|call/i.test(p.summary);
    bottlenecks.push({
      area: isSales ? "Sales outreach" : `Avoidance: ${p.summary.replace(/^Consistently avoids:\s*/, "").replace(/\s*\(\d+×\)\.$/, "")}`,
      severity: p.evidence_count >= 5 ? "high" : "medium",
      description: p.summary,
      impact: isSales ? "Top-of-funnel starves; pipeline thins out." : "High-value work keeps slipping.",
      evidence_count: p.evidence_count,
    });
    if (isSales) signals.add("sales");
  }

  return { bottlenecks, signals };
}

function label(signal: BehaviorSignal): string {
  switch (signal) {
    case "follow_up":
      return "Follow-ups";
    case "sales":
      return "Sales activities";
    case "launch":
      return "Launches";
    case "meeting":
      return "Meetings";
    case "decision":
      return "Decisions";
    default:
      return signal;
  }
}

function impactOf(signal: BehaviorSignal): string {
  switch (signal) {
    case "follow_up":
      return "Warm opportunities go cold; revenue left on the table.";
    case "sales":
      return "Pipeline weakens and revenue becomes lumpy.";
    case "launch":
      return "Momentum and launch-day impact are lost.";
    case "meeting":
      return "Time leaks; decisions get deferred.";
    case "decision":
      return "Rework and second-guessing slow everything down.";
    default:
      return "Throughput suffers.";
  }
}
