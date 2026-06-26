import {
  ProcessOffloadInputSchema,
  OffloadRecordSchema,
  type ProcessOffloadInput,
  type OffloadRecord,
  type Understanding,
  type HandledItem,
  type OffloadDisposition,
} from "@alfy2/shared";

/**
 * Cognitive Offloading Engine (COE) — the L0 executive pipeline (docs/adr/ADR-0093-cognitive-offload.md).
 * Any input passes through five stages: Stage 1 Understand (extract objectives, decisions, problems,
 * opportunities, constraints, risks, deadlines, metrics, urgency, dependencies via sentence/keyword
 * heuristics), Stage 2 Connect (match input businesses + existing knowledge), Stage 3 Build (artifacts
 * derived from objectives/decisions), Stage 4 Delegate (each item gets a disposition and an
 * "can-Alyssa-forget" verdict — anything implying strategic judgment, creativity, negotiation,
 * relationships, vision, ethics, or approval needs Alyssa), and Stage 5 Executive Report (only what needs
 * executive attention). Deterministic. Tenant-scoped.
 */

/** Words that imply an item genuinely needs Alyssa's human judgment. */
const NEEDS_ALYSSA = [
  "decide", "decision", "approve", "approval", "negotiate", "negotiation", "hire", "hiring", "fire",
  "strategy", "strategic", "vision", "ethic", "ethics", "creative", "relationship", "partner",
  "invest", "acquire", "acquisition", "pivot",
];

/** Words that imply urgency. */
const URGENT = ["urgent", "asap", "today", "deadline", "immediately", "now"];

export class CognitiveOffloadingEngine {
  private readonly records = new Map<string, OffloadRecord>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Run an input through the five-stage pipeline and return only what needs executive attention. */
  process(tenantId: string, input: ProcessOffloadInput): OffloadRecord {
    const i = ProcessOffloadInputSchema.parse(input);
    const sentences = splitSentences(i.content);
    const lower = i.content.toLowerCase();

    // Stage 1 — Understanding.
    const understanding = this.understand(sentences, lower);

    // Stage 2 — Connections.
    const connections: string[] = [];
    for (const b of i.businesses) {
      if (lower.includes(b.toLowerCase())) connections.push(`Connects to ${b}`);
    }
    connections.push("Links to existing knowledge");

    // Stage 3 — Built artifacts.
    const built: string[] = [];
    for (const o of understanding.objectives) built.push(`Task created: ${o}`);
    for (const d of understanding.decisions) built.push(`Note saved: ${d}`);
    if (built.length === 0) built.push("Note saved");

    // Stage 4 — Handled items (one per objective + one per decision).
    const handled: HandledItem[] = [];
    for (const o of understanding.objectives) handled.push(this.handle(o));
    for (const d of understanding.decisions) handled.push(this.handle(d));
    if (handled.length === 0) {
      handled.push({
        title: "Capture and file the input",
        disposition: "archived",
        alyssa_can_forget: true,
        reason: "No actionable objective or decision detected — captured for the record.",
      });
    }

    // Stage 5 — Executive report.
    const completed = handled
      .filter((h) => h.disposition === "automated" || h.disposition === "scheduled")
      .map((h) => h.title);
    const decisionsRequiringAlyssa = handled.filter((h) => !h.alyssa_can_forget).map((h) => h.title);
    const forgettable = handled.filter((h) => h.alyssa_can_forget).length;
    const cognitiveLoadRemoved = handled.length > 0 ? round(forgettable / handled.length) : 0;

    const whatChanged =
      built.length > 0
        ? `${handled.length} item(s) processed; ${completed.length} handled automatically.`
        : "Input captured.";
    const whyItMatters =
      decisionsRequiringAlyssa.length > 0
        ? `${decisionsRequiringAlyssa.length} item(s) need your judgment; the rest is owned by the system.`
        : "Everything is owned by the system — you can forget about it.";

    const record = OffloadRecordSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      understanding,
      connections,
      built,
      handled,
      what_changed: whatChanged,
      why_it_matters: whyItMatters,
      completed_automatically: completed,
      decisions_requiring_alyssa: decisionsRequiringAlyssa,
      cognitive_load_removed: cognitiveLoadRemoved,
      created_at: this.clock().toISOString(),
    });
    this.records.set(record.id, record);
    return record;
  }

  get(tenantId: string, id: string): OffloadRecord | undefined {
    const r = this.records.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): OffloadRecord[] {
    return [...this.records.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- stage 1 heuristics ---

  private understand(sentences: string[], lower: string): Understanding {
    const objectives: string[] = [];
    const decisions: string[] = [];
    const problems: string[] = [];
    const opportunities: string[] = [];
    const constraints: string[] = [];
    const risks: string[] = [];
    const deadlines: string[] = [];
    const metrics: string[] = [];
    const dependencies: string[] = [];

    for (const s of sentences) {
      const l = s.toLowerCase();
      if (/\b(need to|must|should|let'?s|plan to|want to|goal|objective)\b/.test(l)) objectives.push(s);
      if (/\b(decid|chose|choose|agreed|will go with|approve)\b/.test(l)) decisions.push(s);
      if (/\b(problem|issue|broken|failing|blocked|bug|stuck)\b/.test(l)) problems.push(s);
      if (/\b(opportunity|could|potential|upside|chance to|growth)\b/.test(l)) opportunities.push(s);
      if (/\b(only|limited|budget|constraint|cannot|can'?t|no more than)\b/.test(l)) constraints.push(s);
      if (/\b(risk|threat|danger|exposure|might fail|could lose)\b/.test(l)) risks.push(s);
      if (/\b(deadline|due|by friday|by monday|end of|today|tomorrow)\b/.test(l)) deadlines.push(s);
      if (/\b(\$|revenue|conversion|metric|kpi|%|percent|rate|target)\b/.test(l)) metrics.push(s);
      if (/\b(depends on|waiting on|blocked by|after|requires)\b/.test(l)) dependencies.push(s);
    }

    const urgency: Understanding["urgency"] = URGENT.some((w) => lower.includes(w)) ? "now" : "low";

    return {
      objectives,
      decisions,
      problems,
      opportunities,
      constraints,
      risks,
      deadlines,
      metrics,
      context: "",
      emotional_state: "",
      urgency,
      dependencies,
    };
  }

  // --- stage 4 disposition ---

  private handle(title: string): HandledItem {
    const l = title.toLowerCase();
    const needsAlyssa = NEEDS_ALYSSA.some((w) => l.includes(w));
    if (needsAlyssa) {
      return {
        title,
        disposition: "needs_alyssa",
        alyssa_can_forget: false,
        reason: "Implies strategic judgment, creativity, negotiation, relationships, vision, ethics, or approval — needs Alyssa.",
      };
    }
    const disposition: OffloadDisposition = pickDisposition(l);
    return {
      title,
      disposition,
      alyssa_can_forget: true,
      reason: `Routine work the system owns — ${disposition}. Alyssa can forget about it.`,
    };
  }
}

/** Choose a non-escalating disposition for a routine item. */
function pickDisposition(lower: string): OffloadDisposition {
  if (/\b(schedul|calendar|remind|book|set up a meeting)\b/.test(lower)) return "scheduled";
  if (/\b(assign|delegate|hand to|owner)\b/.test(lower)) return "assigned";
  if (/\b(later|someday|backlog|defer)\b/.test(lower)) return "deferred";
  if (/\b(review|check|look at)\b/.test(lower)) return "reviewed";
  if (/\b(archive|file|fyi|note)\b/.test(lower)) return "archived";
  return "automated";
}

/** Split content into trimmed, non-empty sentences. */
function splitSentences(content: string): string[] {
  return content
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim().replace(/[\r\n]+/g, " "))
    .filter((s) => s.length > 0);
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
