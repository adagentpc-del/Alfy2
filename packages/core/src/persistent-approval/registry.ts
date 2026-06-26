import {
  CreatePersistentApprovalInputSchema,
  PersistentApprovalSchema,
  type CreatePersistentApprovalInput,
  type PersistentApproval,
  type ApprovalLifecycleStatus,
  type ReviewSchedule,
  type GrantType,
  type ActionRequest,
} from "@alfy2/shared";
import { covers } from "./scope.js";

/**
 * The Persistent Approval registry — so the operator approves a workflow ONCE. Each grant carries a
 * scope, expiration, limits, success metrics, and a review schedule. `authorize` is what the Security
 * Gate calls: if a live, in-scope, within-limits grant exists, the action is pre-approved (and the
 * grant's use is recorded) instead of queuing a fresh approval. Grants automatically expire and enter
 * review. Tenant-scoped. See docs/adr/ADR-0017-persistent-approval.md.
 */

export class PersistentApprovalError extends Error {}

const DAY = 86_400_000;
const addDays = (from: Date, days: number): string => new Date(from.getTime() + days * DAY).toISOString();

/** Derive the review schedule from the grant button unless one was given explicitly. */
function deriveReview(input: CreatePersistentApprovalInput): ReviewSchedule {
  if (input.review_schedule !== null) return input.review_schedule;
  if (input.grant_type === "review_monthly") return "monthly";
  if (input.grant_type === "review_quarterly") return "quarterly";
  if (input.grant_type === "duration") return "on_expiry";
  return "none";
}

/** Derive the expiry timestamp from the grant button. */
function deriveExpiry(input: CreatePersistentApprovalInput, now: Date): string | null {
  return input.grant_type === "duration" ? addDays(now, input.duration_days) : null;
}

/** Derive the next scheduled review timestamp from the review schedule + expiry. */
function deriveNextReview(schedule: ReviewSchedule, expiresAt: string | null, now: Date): string | null {
  switch (schedule) {
    case "monthly":
      return addDays(now, 30);
    case "quarterly":
      return addDays(now, 90);
    case "on_expiry":
      return expiresAt;
    default:
      return null;
  }
}

export class PersistentApprovalRegistry {
  private readonly grants = new Map<string, PersistentApproval>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Grant a standing approval. Expiry + review schedule are derived from the grant button. */
  grant(tenantId: string, input: CreatePersistentApprovalInput): PersistentApproval {
    const i = CreatePersistentApprovalInputSchema.parse(input);
    const now = this.clock();
    const review_schedule = deriveReview(i);
    const expires_at = deriveExpiry(i, now);
    const next_review_at = deriveNextReview(review_schedule, expires_at, now);

    const approval = PersistentApprovalSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      principal: i.principal,
      label: i.label,
      grant_type: i.grant_type,
      scope: {
        action_class: i.action_class,
        action_pattern: i.action_pattern,
        business_id: i.business_id,
        goal_id: i.goal_id,
        environments: i.environments,
      },
      limits: {
        max_uses: i.max_uses,
        used_count: 0,
        max_amount_usd: i.max_amount_usd,
      },
      success_metrics: i.success_metrics,
      review_schedule,
      status: "active",
      expires_at,
      next_review_at,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    this.grants.set(approval.id, approval);
    return approval;
  }

  /**
   * Authorize an action against standing grants. If a live, in-scope, within-limits grant covers it,
   * records one use and returns that grant (the action is pre-approved). Otherwise returns null and
   * the caller should fall back to requesting a fresh approval.
   */
  authorize(tenantId: string, request: ActionRequest, now?: Date): PersistentApproval | null {
    const at = now ?? this.clock();
    const match = this.match(tenantId, request, at);
    if (!match) return null;
    const consumed: PersistentApproval = {
      ...match,
      limits: { ...match.limits, used_count: match.limits.used_count + 1 },
      updated_at: at.toISOString(),
    };
    this.grants.set(consumed.id, consumed);
    return consumed;
  }

  /** Find a covering grant without consuming it (non-mutating). */
  match(tenantId: string, request: ActionRequest, now?: Date): PersistentApproval | null {
    const at = now ?? this.clock();
    for (const g of this.grants.values()) {
      if (g.tenant_id === tenantId && covers(g, request, at)) return g;
    }
    return null;
  }

  /**
   * Move grants that have expired or come due for review into `in_review` (they automatically expire
   * and enter review). Returns how many were moved.
   */
  expireDue(tenantId: string, now?: Date): number {
    const t = (now ?? this.clock()).getTime();
    let moved = 0;
    for (const g of this.grants.values()) {
      if (g.tenant_id !== tenantId || g.status !== "active") continue;
      const expired = g.expires_at !== null && new Date(g.expires_at).getTime() <= t;
      const dueForReview = g.next_review_at !== null && new Date(g.next_review_at).getTime() <= t;
      if (expired || dueForReview) {
        this.setStatus(g, "in_review");
        moved += 1;
      }
    }
    return moved;
  }

  /** End "allow until goal complete" grants when their goal completes. Returns how many ended. */
  expireForGoal(tenantId: string, goalId: string): number {
    let ended = 0;
    for (const g of this.grants.values()) {
      if (
        g.tenant_id === tenantId &&
        g.status === "active" &&
        g.grant_type === "until_goal" &&
        g.scope.goal_id === goalId
      ) {
        this.setStatus(g, "expired");
        ended += 1;
      }
    }
    return ended;
  }

  /** Re-approve a grant that is in review: reactivate and reschedule the next review/expiry. */
  renew(tenantId: string, id: string): PersistentApproval {
    const g = this.require(tenantId, id);
    if (g.status === "revoked") throw new PersistentApprovalError(`Grant ${id} is revoked.`);
    const now = this.clock();
    const expires_at =
      g.grant_type === "duration"
        ? addDays(now, 30)
        : g.expires_at;
    const next_review_at = deriveNextReview(g.review_schedule, expires_at, now);
    const renewed: PersistentApproval = {
      ...g,
      status: "active",
      expires_at,
      next_review_at,
      updated_at: now.toISOString(),
    };
    this.grants.set(id, renewed);
    return renewed;
  }

  /** Revoke a grant — terminal. */
  revoke(tenantId: string, id: string): PersistentApproval {
    const g = this.require(tenantId, id);
    return this.setStatus(g, "revoked");
  }

  get(tenantId: string, id: string): PersistentApproval | undefined {
    const g = this.grants.get(id);
    return g && g.tenant_id === tenantId ? g : undefined;
  }

  list(tenantId: string, status?: ApprovalLifecycleStatus): PersistentApproval[] {
    return [...this.grants.values()].filter(
      (g) => g.tenant_id === tenantId && (status ? g.status === status : true),
    );
  }

  private setStatus(g: PersistentApproval, status: ApprovalLifecycleStatus): PersistentApproval {
    const next: PersistentApproval = { ...g, status, updated_at: this.clock().toISOString() };
    this.grants.set(g.id, next);
    return next;
  }

  private require(tenantId: string, id: string): PersistentApproval {
    const g = this.get(tenantId, id);
    if (!g) throw new PersistentApprovalError(`No persistent approval ${id} in tenant ${tenantId}.`);
    return g;
  }
}

export type { GrantType };
