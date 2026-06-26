import {
  DecisionRecordSchema,
  type DecisionRecord,
  type DecisionLens,
  type DecisionLensReading,
  type DecisionType,
  type DecisionReversibility,
  type DecisionRecordStatus,
} from "@alfy2/shared";
import type {
  DecisionRecordRepository,
  DecisionListFilter,
} from "./repository.js";
import { LENSES_BY_TYPE } from "./lenses.js";

/** Decision types whose blast radius always trips the approval gate, regardless of reversibility. */
const ALWAYS_APPROVE_TYPES: ReadonlySet<DecisionType> = new Set<DecisionType>([
  "pricing",
  "capital",
  "legal",
  "spend",
]);

/** Per-lens override the caller may supply for a deterministic, human-authored reading. */
export interface DecisionLensNote {
  reading?: string;
  score?: number;
  caution?: string;
}

/** Input to {@link AdvisoryDecisionEngine.evaluate}. */
export interface EvaluateDecisionInput {
  title: string;
  summary?: string;
  decision_type: DecisionType;
  business_id?: string;
  reversibility: DecisionReversibility;
  risks?: string[];
  assumptions?: string[];
  required_data?: string[];
  upside?: string;
  downside?: string;
  /** Optional per-lens overrides keyed by lens; missing fields fall back to deterministic neutrals. */
  lens_notes?: Partial<Record<DecisionLens, DecisionLensNote>>;
}

export interface AdvisoryDecisionEngineOptions {
  /** Injectable clock (defaults to wall-clock). Used for created_at / decided_at. */
  clock?: () => Date;
  /** Injectable id factory (defaults to crypto.randomUUID). */
  idFactory?: () => string;
}

/**
 * Advisory Decision Engine (§35) — NAMED `AdvisoryDecisionEngine` to avoid colliding with the
 * pre-existing `DecisionEngine` in core/decision/engine.ts.
 *
 * Deterministic: selects lenses by decision type, builds a per-lens reading (caller override else a
 * neutral default), sets the reversibility-based approval gate, and persists a {@link DecisionRecord}
 * in status "open". One-way-door (irreversible) decisions — and pricing/capital/legal/spend decision
 * types — always require approval. No I/O beyond the injected {@link DecisionRecordRepository}; the
 * clock and id factory are injectable so runs are reproducible.
 */
export class AdvisoryDecisionEngine {
  private readonly clock: () => Date;
  private readonly idFactory: () => string;

  constructor(
    private readonly repo: DecisionRecordRepository,
    options: AdvisoryDecisionEngineOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Run the selected lenses, set the reversibility gate, and persist an open decision record. */
  async evaluate(tenantId: string, input: EvaluateDecisionInput): Promise<DecisionRecord> {
    const lenses = LENSES_BY_TYPE[input.decision_type] ?? [];
    const notes = input.lens_notes ?? {};
    const lens_analysis: DecisionLensReading[] = lenses.map((lens) => {
      const note = notes[lens] ?? {};
      return {
        lens,
        reading: note.reading ?? `${lens} lens: review required`,
        score: note.score ?? 5,
        caution: note.caution ?? "",
      };
    });

    const approval_required =
      input.reversibility === "one_way_door" ||
      ALWAYS_APPROVE_TYPES.has(input.decision_type);

    const door = input.reversibility === "one_way_door" ? "one-way door" : "two-way door";
    const recommendation = approval_required
      ? `${door}: approval required before proceeding.`
      : `${door}: may proceed within configured limits.`;

    const rec = DecisionRecordSchema.parse({
      id: this.idFactory(),
      tenant_id: tenantId,
      title: input.title,
      summary: input.summary ?? "",
      decision_type: input.decision_type,
      risks: input.risks ?? [],
      upside: input.upside ?? "",
      downside: input.downside ?? "",
      assumptions: input.assumptions ?? [],
      reversibility: input.reversibility,
      required_data: input.required_data ?? [],
      lens_analysis,
      recommendation,
      approval_required,
      status: "open",
      created_at: this.clock().toISOString(),
      ...(input.business_id !== undefined ? { business_id: input.business_id } : {}),
    });
    await this.repo.save(rec);
    return rec;
  }

  /** Record the operator's decision (approve/reject/defer). Stamps decided_at from the clock. */
  async decide(
    tenantId: string,
    id: string,
    input: { status: Exclude<DecisionRecordStatus, "open"> },
  ): Promise<void> {
    await this.repo.setDecision(tenantId, id, input.status, this.clock().toISOString());
  }

  list(tenantId: string, filter?: DecisionListFilter): Promise<DecisionRecord[]> {
    return this.repo.list(tenantId, filter);
  }

  get(tenantId: string, id: string): Promise<DecisionRecord | null> {
    return this.repo.get(tenantId, id);
  }
}
