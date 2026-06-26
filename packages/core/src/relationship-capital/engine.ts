import {
  UpsertRelationshipInputSchema,
  RelationshipCapitalRecordSchema,
  type UpsertRelationshipInput,
  type RelationshipCapitalRecord,
  type RelationshipOpportunity,
} from "@alfy2/shared";

/**
 * Relationship Capital Engine (docs/adr/ADR-0130-relationship-capital.md). upsert() creates or updates one
 * relationship record per (tenant, person). surface() computes value-creating moves — reconnect when health
 * is low, provide value when strength is low, and always a way to thank or celebrate — so trust compounds
 * over decades. Deterministic. Tenant-scoped. Mutable in-memory store keyed by person.
 */
export class RelationshipCapitalEngine {
  private readonly records = new Map<string, RelationshipCapitalRecord>(); // key: `${tenant}:${person_id}`
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  upsert(tenantId: string, input: UpsertRelationshipInput): RelationshipCapitalRecord {
    const i = UpsertRelationshipInputSchema.parse(input);
    const key = `${tenantId}:${i.person_id}`;
    const now = this.clock().toISOString();
    const existing = this.records.get(key);
    const record = RelationshipCapitalRecordSchema.parse({
      id: existing?.id ?? this.newId(),
      tenant_id: tenantId,
      person_id: i.person_id,
      name: i.name,
      kind: i.kind,
      conversation_history: existing?.conversation_history ?? [],
      follow_up_history: existing?.follow_up_history ?? [],
      important_dates: existing?.important_dates ?? [],
      shared_interests: existing?.shared_interests ?? [],
      business_opportunities: existing?.business_opportunities ?? [],
      introductions: existing?.introductions ?? [],
      promises_made: existing?.promises_made ?? [],
      preferred_communication: i.preferred_communication || (existing?.preferred_communication ?? ""),
      health: existing?.health ?? 0.5,
      strength: existing?.strength ?? 0.5,
      opportunities: existing?.opportunities ?? [],
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });
    this.records.set(key, record);
    return record;
  }

  /** Recompute and store the value-creating opportunities for a relationship. */
  surface(tenantId: string, personId: string): RelationshipCapitalRecord {
    const key = `${tenantId}:${personId}`;
    const record = this.records.get(key);
    if (!record || record.tenant_id !== tenantId) {
      throw new Error(`Relationship for person ${personId} not found for tenant ${tenantId}.`);
    }
    const opportunities: RelationshipOpportunity[] = [];
    if (record.health < 0.4) {
      opportunities.push({ move: "reconnect", reason: `Health is low (${record.health}) — reconnect before it goes cold.`, priority: round(1 - record.health) });
    }
    if (record.strength < 0.5) {
      opportunities.push({ move: "provide_value", reason: "Provide value before asking — strengthen the relationship first.", priority: round(0.5 + (0.5 - record.strength)) });
    }
    const unkept = record.promises_made.filter((p) => !p.kept).length;
    if (unkept > 0) {
      opportunities.push({ move: "thank", reason: `${unkept} open promise(s) — follow through and acknowledge them.`, priority: 0.7 });
    }
    opportunities.push({ move: "celebrate_win", reason: "Look for a recent win to celebrate — low-cost, high-trust.", priority: 0.4 });

    const updated = RelationshipCapitalRecordSchema.parse({ ...record, opportunities, updated_at: this.clock().toISOString() });
    this.records.set(key, updated);
    return updated;
  }

  get(tenantId: string, personId: string): RelationshipCapitalRecord | undefined {
    const r = this.records.get(`${tenantId}:${personId}`);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): RelationshipCapitalRecord[] {
    return [...this.records.values()].filter((r) => r.tenant_id === tenantId);
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
