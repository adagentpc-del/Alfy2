import {
  ScanInputSchema,
  DroppedItemSchema,
  type ScanInput,
  type DroppedItem,
  type DroppedKind,
  type BallCandidate,
} from "@alfy2/shared";

/**
 * The Don't Drop the Ball System (docs/adr/ADR-0037-dont-drop-the-ball.md). It detects the things that
 * quietly fall through the cracks — forgotten leads, missed follow-ups, unfinished launches, abandoned
 * ideas, stale campaigns, unpaid invoices, unsigned contracts, open loops, and waiting-on responses — by
 * flagging anything past a per-kind staleness threshold, surfaces them (newest concern first), and once
 * approved assigns an agent to close the loop. Deterministic. Tenant-scoped.
 */

export class DontDropBallError extends Error {}

/** Days of inactivity before each kind counts as dropped. */
export const STALENESS_DAYS: Record<DroppedKind, number> = {
  forgotten_lead: 7,
  missed_follow_up: 3,
  unfinished_launch: 14,
  abandoned_idea: 30,
  stale_campaign: 21,
  unpaid_invoice: 30,
  unsigned_contract: 7,
  open_loop: 7,
  waiting_on_response: 5,
};

/** The recommended action to close each kind of dropped item. */
const ACTION_FOR: Record<DroppedKind, string> = {
  forgotten_lead: "Re-engage the lead with a relevant, low-friction touch.",
  missed_follow_up: "Send the overdue follow-up referencing the last contact.",
  unfinished_launch: "Finish the remaining launch steps or formally pause it.",
  abandoned_idea: "Decide: revive with a small next step, or archive it.",
  stale_campaign: "Refresh or stop the campaign and reallocate the budget.",
  unpaid_invoice: "Send a payment reminder and confirm the due date.",
  unsigned_contract: "Chase the signature; offer to walk through any blockers.",
  open_loop: "Close the loop: confirm the outcome or hand it off.",
  waiting_on_response: "Bump the thread or escalate if it stays silent.",
};

const DAY = 86_400_000;

export interface DontDropBallOptions {
  clock?: () => Date;
  idFactory?: () => string;
  /** Override staleness thresholds (days) per kind. */
  thresholds?: Partial<Record<DroppedKind, number>>;
}

export class DontDropBallSystem {
  private readonly items = new Map<string, DroppedItem>();
  /** signature (kind|title|business) → id, to dedupe re-scans. */
  private readonly bySignature = new Map<string, string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly thresholds: Record<DroppedKind, number>;

  constructor(options: DontDropBallOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.thresholds = { ...STALENESS_DAYS, ...(options.thresholds ?? {}) };
  }

  /**
   * Scan candidates and flag any past its kind's staleness threshold as a dropped item. Re-scanning
   * upserts by signature (so the same ball isn't flagged twice) and preserves an assigned/closed status.
   */
  scan(tenantId: string, input: ScanInput): DroppedItem[] {
    const { candidates } = ScanInputSchema.parse(input);
    const now = this.clock();
    const flagged: DroppedItem[] = [];

    for (const c of candidates) {
      const ageDays = Math.floor((now.getTime() - new Date(c.last_activity_at).getTime()) / DAY);
      if (ageDays < this.thresholds[c.kind]) continue; // still fresh — not dropped

      const sig = `${tenantId}|${c.kind}|${c.title}|${c.business_name}`;
      const existingId = this.bySignature.get(sig);
      if (existingId) {
        const prev = this.items.get(existingId)!;
        const updated = DroppedItemSchema.parse({ ...prev, age_days: ageDays, value_usd: c.value_usd, updated_at: now.toISOString() });
        this.items.set(existingId, updated);
        flagged.push(updated);
        continue;
      }
      const item = DroppedItemSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        kind: c.kind,
        title: c.title,
        business_id: c.business_id,
        business_name: c.business_name,
        age_days: ageDays,
        value_usd: c.value_usd,
        status: "open",
        assigned_agent: null,
        recommended_action: ACTION_FOR[c.kind],
        detected_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
      this.items.set(item.id, item);
      this.bySignature.set(sig, item.id);
      flagged.push(item);
    }
    return this.rank(flagged);
  }

  /** The daily surface: open dropped items, ranked by value then age (most urgent first). */
  surfaceDaily(tenantId: string): DroppedItem[] {
    return this.rank([...this.items.values()].filter((i) => i.tenant_id === tenantId && i.status === "open"));
  }

  /** Approve a dropped item and assign an agent to close the loop. */
  assign(tenantId: string, id: string, agentKey: string): DroppedItem {
    const it = this.require(tenantId, id);
    if (it.status === "closed" || it.status === "dismissed") {
      throw new DontDropBallError(`Dropped item ${id} is ${it.status}.`);
    }
    return this.save({ ...it, status: "assigned", assigned_agent: agentKey });
  }

  /** Mark a dropped item closed (loop closed). */
  close(tenantId: string, id: string): DroppedItem {
    return this.save({ ...this.require(tenantId, id), status: "closed" });
  }

  /** Dismiss a dropped item (intentionally not pursuing). */
  dismiss(tenantId: string, id: string): DroppedItem {
    return this.save({ ...this.require(tenantId, id), status: "dismissed" });
  }

  get(tenantId: string, id: string): DroppedItem | undefined {
    const it = this.items.get(id);
    return it && it.tenant_id === tenantId ? it : undefined;
  }

  list(tenantId: string): DroppedItem[] {
    return this.rank([...this.items.values()].filter((i) => i.tenant_id === tenantId));
  }

  private rank(list: DroppedItem[]): DroppedItem[] {
    return [...list].sort((a, b) => (b.value_usd - a.value_usd) || (b.age_days - a.age_days));
  }

  private save(it: DroppedItem): DroppedItem {
    const next = DroppedItemSchema.parse({ ...it, updated_at: this.clock().toISOString() });
    this.items.set(next.id, next);
    return next;
  }

  private require(tenantId: string, id: string): DroppedItem {
    const it = this.get(tenantId, id);
    if (!it) throw new DontDropBallError(`No dropped item ${id} in tenant ${tenantId}.`);
    return it;
  }
}

export type { BallCandidate };
