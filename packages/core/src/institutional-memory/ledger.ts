import {
  CaptureRecordInputSchema,
  InstitutionalRecordSchema,
  type CaptureRecordInput,
  type InstitutionalRecord,
  type InstitutionalRecordKind,
} from "@alfy2/shared";

/**
 * Institutional Memory (docs/adr/ADR-0057-institutional-memory.md). Prevents loss of knowledge by
 * capturing why decisions were made, rejected ideas, failed and successful experiments, negotiation
 * outcomes, lessons, vendor experiences, client preferences, and implementation history. Every decision
 * record answers "what did we know at the time, and why did we choose this?" Append-only — records are
 * never edited or deleted, only added. Deterministic. Tenant-scoped.
 */

export class InstitutionalMemoryError extends Error {}

export class InstitutionalMemory {
  private readonly records: InstitutionalRecord[] = [];
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /**
   * Capture a record. For `decision_rationale`, both `what_we_knew` and `why_chosen` are required — the
   * core question Institutional Memory exists to answer.
   */
  capture(tenantId: string, input: CaptureRecordInput): InstitutionalRecord {
    const i = CaptureRecordInputSchema.parse(input);
    if (i.kind === "decision_rationale" && (i.what_we_knew.trim() === "" || i.why_chosen.trim() === "")) {
      throw new InstitutionalMemoryError("A decision_rationale must record what_we_knew AND why_chosen.");
    }
    const record = InstitutionalRecordSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      title: i.title,
      detail: i.detail,
      what_we_knew: i.what_we_knew,
      why_chosen: i.why_chosen,
      alternatives_rejected: i.alternatives_rejected,
      business_id: i.business_id,
      tags: i.tags,
      created_at: this.clock().toISOString(),
    });
    this.records.push(record);
    return record;
  }

  list(tenantId: string): InstitutionalRecord[] {
    return this.records.filter((r) => r.tenant_id === tenantId);
  }

  byKind(tenantId: string, kind: InstitutionalRecordKind): InstitutionalRecord[] {
    return this.list(tenantId).filter((r) => r.kind === kind);
  }

  /** Search by term across title/detail/rationale/tags. */
  search(tenantId: string, term: string): InstitutionalRecord[] {
    const t = term.toLowerCase();
    return this.list(tenantId).filter((r) =>
      `${r.title} ${r.detail} ${r.what_we_knew} ${r.why_chosen} ${r.tags.join(" ")}`.toLowerCase().includes(t),
    );
  }

  /** For a decision record, the answer to "what did we know, and why did we choose this?" */
  rationaleFor(tenantId: string, id: string): { what_we_knew: string; why_chosen: string; alternatives_rejected: string[] } | undefined {
    const r = this.records.find((x) => x.id === id && x.tenant_id === tenantId);
    if (!r || r.kind !== "decision_rationale") return undefined;
    return { what_we_knew: r.what_we_knew, why_chosen: r.why_chosen, alternatives_rejected: r.alternatives_rejected };
  }
}
