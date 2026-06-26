import {
  AddQueueItemInputSchema,
  QueueItemSchema,
  type AddQueueItemInput,
  type QueueItem,
  type QueueBucket,
  type QueueCategory,
} from "@alfy2/shared";

/**
 * The Execution Queue (docs/adr/ADR-0036-execution-queue.md). Separates work into eight buckets and
 * ranks it by a fixed priority order — revenue → risk → deadlines → follow-up → operations → personal
 * admin → nice-to-have — so the system always knows what to do next. Within a priority tier, sooner
 * deadlines and higher value come first. Deterministic. Tenant-scoped.
 */

/** Priority rank by category (lower number = higher priority). */
export const CATEGORY_RANK: Record<QueueCategory, number> = {
  revenue: 0,
  risk: 1,
  deadline: 2,
  follow_up: 3,
  operations: 4,
  personal_admin: 5,
  nice_to_have: 6,
};

export interface ExecutionQueueOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class ExecutionQueue {
  private readonly items = new Map<string, QueueItem>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: ExecutionQueueOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Add an item to the queue. */
  add(tenantId: string, input: AddQueueItemInput): QueueItem {
    const i = AddQueueItemInputSchema.parse(input);
    const now = this.clock().toISOString();
    const item = QueueItemSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      bucket: i.bucket,
      category: i.category,
      title: i.title,
      business_id: i.business_id,
      value_usd: i.value_usd,
      due: i.due,
      actionable: i.actionable,
      done: false,
      created_at: now,
      updated_at: now,
    });
    this.items.set(item.id, item);
    return item;
  }

  /** Move an item to a different bucket (e.g. unblock → approved_action). */
  move(tenantId: string, id: string, bucket: QueueBucket, actionable?: boolean): QueueItem {
    const it = this.require(tenantId, id);
    return this.save({ ...it, bucket, ...(actionable !== undefined ? { actionable } : {}) });
  }

  /** Mark an item done. */
  complete(tenantId: string, id: string): QueueItem {
    return this.save({ ...this.require(tenantId, id), done: true });
  }

  /**
   * The single most important thing to do next: the highest-priority actionable, not-done item.
   * Blocked actions and items waiting on Alyssa are not actionable and are skipped.
   */
  next(tenantId: string): QueueItem | undefined {
    return this.ranked(tenantId).find((it) => it.actionable && !it.done);
  }

  /** All open items ranked by priority order, then by due date, then by value. */
  ranked(tenantId: string): QueueItem[] {
    return [...this.items.values()]
      .filter((it) => it.tenant_id === tenantId && !it.done)
      .sort((a, b) => {
        if (CATEGORY_RANK[a.category] !== CATEGORY_RANK[b.category]) return CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
        const da = a.due ? new Date(a.due).getTime() : Infinity;
        const db = b.due ? new Date(b.due).getTime() : Infinity;
        if (da !== db) return da - db;
        return b.value_usd - a.value_usd;
      });
  }

  /** Items in a given bucket. */
  byBucket(tenantId: string, bucket: QueueBucket): QueueItem[] {
    return [...this.items.values()].filter((it) => it.tenant_id === tenantId && it.bucket === bucket);
  }

  /** Items waiting on Alyssa (a decision queue). */
  waitingOnAlyssa(tenantId: string): QueueItem[] {
    return this.byBucket(tenantId, "waiting_on_alyssa").filter((it) => !it.done);
  }

  get(tenantId: string, id: string): QueueItem | undefined {
    const it = this.items.get(id);
    return it && it.tenant_id === tenantId ? it : undefined;
  }

  private save(it: QueueItem): QueueItem {
    const next = QueueItemSchema.parse({ ...it, updated_at: this.clock().toISOString() });
    this.items.set(next.id, next);
    return next;
  }

  private require(tenantId: string, id: string): QueueItem {
    const it = this.get(tenantId, id);
    if (!it) throw new Error(`No queue item ${id} in tenant ${tenantId}.`);
    return it;
  }
}
