import {
  QueueHumanTouchInputSchema,
  HumanTouchItemSchema,
  HumanTouchSummarySchema,
  type QueueHumanTouchInput,
  type HumanTouchItem,
  type HumanTouchSummary,
} from "@alfy2/shared";

/**
 * Human Touch Queue (docs/adr/ADR-0145-human-touch-queue.md). queue() logs a required Alyssa-only action so
 * the build never stops; complete()/skip() resolve it. summary() buckets the pending items into ready for
 * Alyssa, waiting for permission, truly blocked, and ready to launch, and reports how many low-risk items
 * Alfy² can keep progressing around without her. Deterministic. Tenant-scoped. Mutable in-memory store.
 */
export class HumanTouchQueue {
  private readonly items = new Map<string, HumanTouchItem>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  queue(tenantId: string, input: QueueHumanTouchInput): HumanTouchItem {
    const i = QueueHumanTouchInputSchema.parse(input);
    const now = this.clock().toISOString();
    const item = HumanTouchItemSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      category: i.category,
      title: i.title,
      why: i.why,
      steps: i.steps,
      copy_paste_value: i.copy_paste_value,
      risk_level: i.risk_level,
      status: "pending",
      build_ref: i.build_ref,
      created_at: now,
      updated_at: now,
    });
    this.items.set(item.id, item);
    return item;
  }

  complete(tenantId: string, id: string): HumanTouchItem {
    return this.setStatus(tenantId, id, "done");
  }

  skip(tenantId: string, id: string): HumanTouchItem {
    return this.setStatus(tenantId, id, "skipped");
  }

  /** The batched session view over pending items. */
  summary(tenantId: string): HumanTouchSummary {
    const pending = this.list(tenantId).filter((it) => it.status === "pending");
    const ready_to_launch = pending.filter((it) => it.category === "final_launch_approval").map((it) => it.title);
    const waiting_for_permission = pending
      .filter((it) => it.category === "allow_permission" || it.category === "login")
      .map((it) => it.title);
    const truly_blocked = pending
      .filter((it) => it.category === "review_legal_money_security" && it.risk_level === "high")
      .map((it) => it.title);
    const handled = new Set([...ready_to_launch, ...waiting_for_permission, ...truly_blocked]);
    const ready_for_alyssa = pending.filter((it) => !handled.has(it.title)).map((it) => it.title);
    const can_continue = pending.filter((it) => it.risk_level === "low" && it.category !== "final_launch_approval").length;

    return HumanTouchSummarySchema.parse({
      ready_for_alyssa,
      waiting_for_permission,
      truly_blocked,
      ready_to_launch,
      can_continue_without_alyssa: can_continue,
      summary:
        `${pending.length} pending: ${ready_for_alyssa.length} ready for Alyssa, ` +
        `${waiting_for_permission.length} waiting for permission, ${truly_blocked.length} truly blocked, ` +
        `${ready_to_launch.length} ready to launch.`,
    });
  }

  get(tenantId: string, id: string): HumanTouchItem | undefined {
    const it = this.items.get(id);
    return it && it.tenant_id === tenantId ? it : undefined;
  }

  list(tenantId: string): HumanTouchItem[] {
    return [...this.items.values()].filter((it) => it.tenant_id === tenantId);
  }

  private setStatus(tenantId: string, id: string, status: HumanTouchItem["status"]): HumanTouchItem {
    const it = this.get(tenantId, id);
    if (!it) throw new Error(`Human touch item ${id} not found for tenant ${tenantId}.`);
    const updated = HumanTouchItemSchema.parse({ ...it, status, updated_at: this.clock().toISOString() });
    this.items.set(id, updated);
    return updated;
  }
}
