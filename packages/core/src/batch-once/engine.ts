import {
  DetectSetupInputSchema,
  BatchedSetupSchema,
  type DetectSetupInput,
  type BatchedSetup,
} from "@alfy2/shared";

/**
 * Batch Once Engine (docs/adr/ADR-0147-batch-once.md). detect() groups a repeated setup pattern into a
 * do-once sprint (upserting by pattern + business context so the same setup is not duplicated). verify() marks
 * it verified; saveAsSop() captures it for reuse. shouldAsk() returns false when a reusable setup already
 * exists for the same pattern and context — Alyssa is never asked to do the same setup twice unless the
 * context differs (or it expired / changed / needs rotation, handled upstream). Deterministic. Tenant-scoped.
 */
export class BatchOnceEngine {
  private readonly setups = new Map<string, BatchedSetup>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  detect(tenantId: string, input: DetectSetupInput): BatchedSetup {
    const i = DetectSetupInputSchema.parse(input);
    const now = this.clock().toISOString();
    const existing = this.find(tenantId, i.pattern, i.business_context);
    if (existing) {
      // Merge new tasks rather than create a duplicate setup.
      const grouped = [...new Set([...existing.grouped_tasks, ...i.tasks])];
      const updated = BatchedSetupSchema.parse({
        ...existing,
        grouped_tasks: grouped,
        one_time_checklist: grouped.map((t) => `Do once: ${t}`),
        updated_at: now,
      });
      this.setups.set(existing.id, updated);
      return updated;
    }
    const setup = BatchedSetupSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      pattern: i.pattern,
      business_context: i.business_context,
      grouped_tasks: i.tasks,
      one_time_checklist: i.tasks.map((t) => `Do once: ${t}`),
      manual_explanation: `Complete the ${i.pattern} setup once; Alfy² will reuse it in future builds.`,
      verified: false,
      reusable: false,
      status: "queued",
      created_at: now,
      updated_at: now,
    });
    this.setups.set(setup.id, setup);
    return setup;
  }

  verify(tenantId: string, id: string, recordedLocations: string[] = []): BatchedSetup {
    const s = this.require(tenantId, id);
    const updated = BatchedSetupSchema.parse({
      ...s,
      verified: true,
      recorded_locations: recordedLocations.length ? recordedLocations : s.recorded_locations,
      status: "verified",
      updated_at: this.clock().toISOString(),
    });
    this.setups.set(id, updated);
    return updated;
  }

  saveAsSop(tenantId: string, id: string, sopRef: string): BatchedSetup {
    const s = this.require(tenantId, id);
    const updated = BatchedSetupSchema.parse({
      ...s,
      sop_ref: sopRef,
      reusable: true,
      status: "reusable",
      updated_at: this.clock().toISOString(),
    });
    this.setups.set(id, updated);
    return updated;
  }

  /** Whether Alyssa should be asked to do this setup, or it can be reused from a prior sprint. */
  shouldAsk(tenantId: string, pattern: BatchedSetup["pattern"], businessContext = ""): boolean {
    const existing = this.find(tenantId, pattern, businessContext);
    return !(existing && existing.reusable);
  }

  get(tenantId: string, id: string): BatchedSetup | undefined {
    const s = this.setups.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  list(tenantId: string): BatchedSetup[] {
    return [...this.setups.values()].filter((s) => s.tenant_id === tenantId);
  }

  private find(tenantId: string, pattern: BatchedSetup["pattern"], context: string): BatchedSetup | undefined {
    return this.list(tenantId).find((s) => s.pattern === pattern && s.business_context === context);
  }

  private require(tenantId: string, id: string): BatchedSetup {
    const s = this.get(tenantId, id);
    if (!s) throw new Error(`Batched setup ${id} not found for tenant ${tenantId}.`);
    return s;
  }
}
