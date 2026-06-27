import {
  ApiApprovalRequestSchema as ApprovalRequestSchema,
  type ApiApprovalRequest as ApprovalRequest,
  type ApiApprovalActionClass as ApprovalActionClass,
  type ApiApprovalRisk as ApprovalRisk,
} from "@alfy2/shared";
import type {
  ApprovalRequestRepository,
  ApprovalListFilter,
} from "./repository.js";

/**
 * The action classes that ALWAYS require approval — everything except `internal_action`. This is the
 * deny-by-default heart of the gate: an action is gated unless it is purely internal.
 */
export const GATED_ACTION_CLASSES: readonly ApprovalActionClass[] = [
  "send_message",
  "publish_public",
  "move_money",
  "charge",
  "deploy",
  "delete_data",
  "send_contract",
  "change_pricing",
  "change_access",
  "change_standing_rule",
  "medical_legal_financial_claim",
  "other",
];

/** Action classes whose blast radius is severe (money/data/deploy/legal). */
const CRITICAL_CLASSES: ReadonlySet<ApprovalActionClass> = new Set([
  "move_money",
  "charge",
  "change_pricing",
  "delete_data",
  "deploy",
  "send_contract",
  "medical_legal_financial_claim",
]);

/** Action classes that are externally visible / change standing rules / access. */
const HIGH_CLASSES: ReadonlySet<ApprovalActionClass> = new Set([
  "publish_public",
  "change_access",
  "change_standing_rule",
  "send_message",
]);

const GATED_SET: ReadonlySet<ApprovalActionClass> = new Set(GATED_ACTION_CLASSES);

export interface RequireApprovalInput {
  action_class: ApprovalActionClass;
  method: string;
  route: string;
  summary: string;
  payload?: Record<string, unknown>;
  business_id?: string;
  requested_by: string;
}

export interface ApprovalGateServiceOptions {
  /** Injectable clock (defaults to wall-clock). Used for created_at / decided_at. */
  clock?: () => Date;
  /** Injectable id factory (defaults to crypto.randomUUID). */
  idFactory?: () => string;
}

/**
 * Deterministic Approval Gate. Classifies an action, persists a pending {@link ApprovalRequest}, and
 * records operator decisions. No I/O beyond the injected {@link ApprovalRequestRepository}; the clock
 * and id factory are injectable so runs are reproducible.
 */
export class ApprovalGateService {
  private readonly clock: () => Date;
  private readonly idFactory: () => string;

  constructor(
    private readonly repo: ApprovalRequestRepository,
    options: ApprovalGateServiceOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Classify an action class into a gating decision + risk band. Pure, deterministic. */
  classify(actionClass: ApprovalActionClass): { requires_approval: boolean; risk: ApprovalRisk } {
    let risk: ApprovalRisk;
    if (CRITICAL_CLASSES.has(actionClass)) risk = "critical";
    else if (HIGH_CLASSES.has(actionClass)) risk = "high";
    else if (actionClass === "internal_action") risk = "low";
    else risk = "medium"; // "other"
    return { requires_approval: GATED_SET.has(actionClass), risk };
  }

  /** Persist a pending approval request for a gated (or merely recorded) action. */
  async requireApproval(tenantId: string, input: RequireApprovalInput): Promise<ApprovalRequest> {
    const { requires_approval, risk } = this.classify(input.action_class);
    const req = ApprovalRequestSchema.parse({
      id: this.idFactory(),
      tenant_id: tenantId,
      action_class: input.action_class,
      method: input.method,
      route: input.route,
      summary: input.summary,
      risk,
      requires_approval,
      status: "pending",
      requested_by: input.requested_by,
      created_at: this.clock().toISOString(),
      ...(input.business_id !== undefined ? { business_id: input.business_id } : {}),
      ...(input.payload !== undefined ? { payload: input.payload } : {}),
    });
    await this.repo.save(req);
    return req;
  }

  /** Record an operator decision (approve/deny). Stamps decided_at from the clock. */
  async decide(
    tenantId: string,
    id: string,
    input: { status: "approved" | "denied"; decided_by: string; reason?: string },
  ): Promise<void> {
    await this.repo.setDecision(
      tenantId,
      id,
      input.status,
      input.decided_by,
      input.reason ?? "",
      this.clock().toISOString(),
    );
  }

  /**
   * Consume an approved request so it cannot be replayed (one-time use). Transitions it to "expired".
   * The gate calls this immediately after an approval unlocks a gated action.
   */
  async consume(tenantId: string, id: string): Promise<void> {
    await this.repo.setDecision(tenantId, id, "expired", "", "consumed", this.clock().toISOString());
  }

  list(tenantId: string, filter?: ApprovalListFilter): Promise<ApprovalRequest[]> {
    return this.repo.list(tenantId, filter);
  }

  get(tenantId: string, id: string): Promise<ApprovalRequest | null> {
    return this.repo.get(tenantId, id);
  }
}
