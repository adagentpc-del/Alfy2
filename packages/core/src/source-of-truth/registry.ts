import {
  RecordTruthInputSchema,
  SourceRecordSchema,
  type RecordTruthInput,
  type SourceRecord,
  type FactKind,
  type Freshness,
} from "@alfy2/shared";

/**
 * Source-of-Truth Management (docs/adr/ADR-0026-source-of-truth-management.md). Alfy² distinguishes the
 * kind of knowledge each memory is — verified facts, assumptions, outdated info, user preferences,
 * inferred patterns, external research, documents, contacts, financial data — and tracks every
 * important record's source, confidence, freshness, owner, last-verified date, and update trigger.
 * Freshness is derived from a per-kind verification TTL. Deterministic. Tenant-scoped.
 */

export class SourceOfTruthError extends Error {}

/** How long (days) a record of each kind stays trustworthy before it ages out. */
export const VERIFY_TTL_DAYS: Record<FactKind, number> = {
  verified_fact: 365,
  assumption: 30,
  outdated: 0,
  user_preference: 180,
  inferred_pattern: 60,
  external_research: 90,
  document: 365,
  contact: 180,
  financial_data: 30,
};

const DAY = 86_400_000;

export interface SourceOfTruthOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class SourceOfTruthRegistry {
  private readonly records = new Map<string, SourceRecord>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: SourceOfTruthOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Record a piece of truth with full provenance. Freshness is derived from when it was last verified. */
  record(tenantId: string, input: RecordTruthInput): SourceRecord {
    const i = RecordTruthInputSchema.parse(input);
    const now = this.clock();
    const freshness = i.kind === "outdated" ? "expired" : this.freshnessFor(i.kind, i.last_verified_at, now);
    const rec = SourceRecordSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      statement: i.statement,
      source: i.source,
      confidence: i.confidence,
      owner: i.owner,
      last_verified_at: i.last_verified_at,
      freshness,
      update_trigger: i.update_trigger,
      memory_id: i.memory_id,
      tags: i.tags,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    this.records.set(rec.id, rec);
    return rec;
  }

  get(tenantId: string, id: string): SourceRecord | undefined {
    const r = this.records.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  /** Re-verify a record: stamp last_verified_at = now, reset freshness, optionally bump confidence. */
  verify(tenantId: string, id: string, opts: { confidence?: number } = {}): SourceRecord {
    const r = this.require(tenantId, id);
    if (r.kind === "outdated") throw new SourceOfTruthError(`Record ${id} is outdated; promote its kind before verifying.`);
    const now = this.clock();
    const next: SourceRecord = SourceRecordSchema.parse({
      ...r,
      last_verified_at: now.toISOString(),
      freshness: "fresh",
      confidence: opts.confidence ?? r.confidence,
      updated_at: now.toISOString(),
    });
    this.records.set(id, next);
    return next;
  }

  /** Mark a record outdated (expired freshness, low confidence). */
  markOutdated(tenantId: string, id: string): SourceRecord {
    const r = this.require(tenantId, id);
    const next: SourceRecord = {
      ...r,
      kind: "outdated",
      freshness: "expired",
      confidence: Math.min(r.confidence, 0.2),
      updated_at: this.clock().toISOString(),
    };
    this.records.set(id, next);
    return next;
  }

  /** Recompute freshness for all of a tenant's records as of now; returns the updated records. */
  refreshAll(tenantId: string): SourceRecord[] {
    const now = this.clock();
    const out: SourceRecord[] = [];
    for (const r of this.records.values()) {
      if (r.tenant_id !== tenantId) continue;
      const freshness = r.kind === "outdated" ? "expired" : this.freshnessFor(r.kind, r.last_verified_at, now);
      if (freshness !== r.freshness) {
        const next = { ...r, freshness, updated_at: now.toISOString() };
        this.records.set(r.id, next);
        out.push(next);
      } else {
        out.push(r);
      }
    }
    return out;
  }

  /** Records that need re-verification: stale or expired freshness (computed as of now). */
  needsVerification(tenantId: string): SourceRecord[] {
    const now = this.clock();
    return [...this.records.values()].filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      const f = r.kind === "outdated" ? "expired" : this.freshnessFor(r.kind, r.last_verified_at, now);
      return f === "stale" || f === "expired";
    });
  }

  /** Filter by kind — distinguish verified facts from assumptions, etc. */
  query(tenantId: string, kind?: FactKind): SourceRecord[] {
    return [...this.records.values()].filter((r) => r.tenant_id === tenantId && (kind ? r.kind === kind : true));
  }

  // --- internals ---

  /** Derive freshness from the verification TTL and how long ago the record was verified. */
  private freshnessFor(kind: FactKind, lastVerifiedAt: string | null, now: Date): Freshness {
    const ttl = VERIFY_TTL_DAYS[kind];
    if (ttl <= 0) return "expired";
    if (lastVerifiedAt === null) return "stale"; // never verified
    const ageDays = (now.getTime() - new Date(lastVerifiedAt).getTime()) / DAY;
    if (ageDays <= ttl * 0.5) return "fresh";
    if (ageDays <= ttl) return "aging";
    if (ageDays <= ttl * 2) return "stale";
    return "expired";
  }

  private require(tenantId: string, id: string): SourceRecord {
    const r = this.get(tenantId, id);
    if (!r) throw new SourceOfTruthError(`No source record ${id} in tenant ${tenantId}.`);
    return r;
  }
}
