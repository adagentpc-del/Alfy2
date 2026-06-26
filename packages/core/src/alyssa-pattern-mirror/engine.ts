import {
  ObserveThinkingInputSchema,
  ThinkingPatternObservationSchema,
  type ObserveThinkingInput,
  type ThinkingPatternObservation,
  type ThinkingPatternKind,
} from "@alfy2/shared";

type Amplification = ThinkingPatternObservation["amplification"];

const FRAMEWORK_THRESHOLD = 3;

/**
 * Alyssa Pattern Mirror (docs/adr/ADR-0132-alyssa-pattern-mirror.md). observe() records how Alyssa thinks,
 * raising confidence with repetition and flagging a framework_candidate once a pattern recurs enough — the
 * handoff to the Teach My Framework engine. It chooses how to amplify each pattern (personalize, suggest an
 * agent, surface an opportunity, or build a framework) without imitating her. Deterministic. Append-only.
 */
export class AlyssaPatternMirror {
  private readonly observations = new Map<string, ThinkingPatternObservation>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  observe(tenantId: string, input: ObserveThinkingInput): ThinkingPatternObservation {
    const i = ObserveThinkingInputSchema.parse(input);
    const confidence = round(Math.min(1, 0.3 + i.occurrences * 0.15));
    const frameworkCandidate = i.occurrences >= FRAMEWORK_THRESHOLD;

    const observation = ThinkingPatternObservationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      observation: i.observation,
      occurrences: i.occurrences,
      confidence,
      framework_candidate: frameworkCandidate,
      amplification: this.amplification(i.kind, frameworkCandidate),
      evidence_refs: i.evidence_refs,
      created_at: this.clock().toISOString(),
    });
    this.observations.set(observation.id, observation);
    return observation;
  }

  get(tenantId: string, id: string): ThinkingPatternObservation | undefined {
    const o = this.observations.get(id);
    return o && o.tenant_id === tenantId ? o : undefined;
  }

  list(tenantId: string): ThinkingPatternObservation[] {
    return [...this.observations.values()].filter((o) => o.tenant_id === tenantId);
  }

  /** Observations recurring enough to become teachable IP. */
  frameworkCandidates(tenantId: string): ThinkingPatternObservation[] {
    return this.list(tenantId).filter((o) => o.framework_candidate);
  }

  private amplification(kind: ThinkingPatternKind, candidate: boolean): Amplification {
    switch (kind) {
      case "business_pattern_recognition":
      case "recurring_theme":
      case "opportunity_detection_style":
        return candidate ? "build_framework" : "surface_opportunity";
      case "bottleneck":
        return "suggest_agent";
      case "language_preference":
      case "decision_criterion":
      case "intuition_signal":
        return "personalize";
      default:
        return candidate ? "build_framework" : "personalize";
    }
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
