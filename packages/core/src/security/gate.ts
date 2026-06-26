import {
  ActionRequestSchema,
  SecurityDecisionSchema,
  type ActionRequest,
  type SecurityDecision,
  type Role,
  type Permission,
  type AuditOutcome,
} from "@alfy2/shared";
import { evaluate, DEFAULT_POLICY_CONFIG, type PolicyConfig } from "./policy.js";
import { AuditLog } from "./audit.js";
import { ApprovalQueue } from "./approvals.js";
import { PermissionGroupRegistry } from "./groups.js";
import { PersistentApprovalRegistry } from "../persistent-approval/registry.js";

/**
 * The Security Gate — the single chokepoint every action passes through. It evaluates a request under
 * least privilege (policy.ts), writes an audit entry for EVERY action (the trail for everything), and
 * queues an approval when one is required. The six sensitive classes — spend money, delete data,
 * modify production, contact external users, sign contracts, install packages — can never resolve to
 * `allow`. Engines are expected to refuse to execute unless the gate returned `allow`.
 * See docs/ENTERPRISE_SECURITY.md.
 */

/** Resolves the roles a principal holds in a tenant (e.g. PermissionChecker.rolesFor). */
export type RoleResolver = (tenantId: string, principal: string) => Role[];
/** Resolves a principal's role-derived permissions (e.g. PermissionChecker.permissionsFor). */
export type PermissionResolver = (tenantId: string, principal: string) => Set<Permission>;

export interface SecurityGateOptions {
  clock?: () => Date;
  idFactory?: () => string;
  audit?: AuditLog;
  approvals?: ApprovalQueue;
  groups?: PermissionGroupRegistry;
  /** Roles a human actor holds. Omit = single-operator owner (full trust) for non-agent actors. */
  roleResolver?: RoleResolver;
  /** Role-derived permissions for an actor. Combined with permission-group permissions. */
  permissionResolver?: PermissionResolver;
  policy?: PolicyConfig;
  /** Standing grants. When present, an action covered by a live grant is pre-approved (no re-queue). */
  persistentApprovals?: PersistentApprovalRegistry;
}

export class SecurityGate {
  readonly audit: AuditLog;
  readonly approvals: ApprovalQueue;
  readonly groups: PermissionGroupRegistry;
  private readonly clock: () => Date;
  private readonly roleResolver: RoleResolver | undefined;
  private readonly permissionResolver: PermissionResolver | undefined;
  private readonly policy: PolicyConfig;
  private readonly persistent: PersistentApprovalRegistry | undefined;

  constructor(options: SecurityGateOptions = {}) {
    const shared: { clock?: () => Date; idFactory?: () => string } = {
      ...(options.clock ? { clock: options.clock } : {}),
      ...(options.idFactory ? { idFactory: options.idFactory } : {}),
    };
    this.clock = options.clock ?? (() => new Date());
    this.audit = options.audit ?? new AuditLog(shared);
    this.approvals = options.approvals ?? new ApprovalQueue(shared);
    this.groups = options.groups ?? new PermissionGroupRegistry(shared);
    this.roleResolver = options.roleResolver;
    this.permissionResolver = options.permissionResolver;
    this.policy = options.policy ?? DEFAULT_POLICY_CONFIG;
    this.persistent = options.persistentApprovals;
  }

  /**
   * Evaluate a proposed action. ALWAYS writes an audit entry; queues an approval when needed.
   * Returns the decision (allow / deny / requires_approval) with explainable reasons.
   */
  evaluate(input: ActionRequest): SecurityDecision {
    const request = ActionRequestSchema.parse(input);

    // Resolve the actor's authority. Agents never get implicit roles. A human with no resolver is
    // treated as the single-operator owner (full trust) so the system is usable before tenancy is wired.
    const roles = this.resolveRoles(request);
    const permissions = this.resolvePermissions(request, roles);

    const verdict = evaluate(request, { roles, permissions }, this.policy);

    // Persistent approval: if the policy would queue a fresh approval but a standing grant covers this
    // action, the operator already approved this scope — pre-approve it instead of re-asking.
    let decision = verdict.decision;
    let reasons = verdict.reasons;
    let standingApprovalId: string | undefined;
    if (verdict.decision === "requires_approval" && this.persistent) {
      const grant = this.persistent.authorize(request.tenant_id, request, this.clock());
      if (grant) {
        decision = "allow";
        standingApprovalId = grant.id;
        reasons = [
          `Covered by standing approval "${grant.label}" (${grant.grant_type}); operator pre-approved this scope.`,
          ...verdict.reasons,
        ];
      }
    }

    const outcome: AuditOutcome =
      decision === "allow" ? "evaluated" : decision === "deny" ? "blocked" : "queued";

    const entry = this.audit.record({
      tenant_id: request.tenant_id,
      actor: request.actor,
      is_agent: request.is_agent,
      action: request.action,
      action_class: request.action_class,
      resource: request.resource,
      target_env: request.target_env,
      decision,
      outcome,
      metadata: {
        reasons,
        ...(standingApprovalId ? { standing_approval_id: standingApprovalId } : {}),
        ...(request.amount_usd !== null ? { amount_usd: request.amount_usd } : {}),
      },
    });

    let approvalId: string | null = null;
    if (decision === "requires_approval") {
      const approval = this.approvals.enqueue({
        tenant_id: request.tenant_id,
        requested_by: request.actor,
        action: request.action,
        action_class: request.action_class,
        resource: request.resource,
        reason: reasons.join(" "),
        required_role: verdict.requiredRole,
        audit_id: entry.id,
      });
      approvalId = approval.id;
    }

    return SecurityDecisionSchema.parse({
      request_id: request.id,
      tenant_id: request.tenant_id,
      decision,
      reasons,
      required_approval: decision === "requires_approval",
      approval_id: approvalId,
      audit_id: entry.id,
      decided_at: this.clock().toISOString(),
    });
  }

  private resolveRoles(request: ActionRequest): Role[] {
    if (request.is_agent) return [];
    if (this.roleResolver) return this.roleResolver(request.tenant_id, request.actor);
    return ["owner"]; // single-operator default
  }

  private resolvePermissions(request: ActionRequest, roles: Role[]): Set<Permission> {
    const perms = new Set<Permission>();
    if (this.permissionResolver) {
      for (const p of this.permissionResolver(request.tenant_id, request.actor)) perms.add(p);
    } else if (!request.is_agent && !this.roleResolver) {
      // single-operator owner default: treat as fully permissioned for the read/write least-privilege gate
      perms.add("approve.irreversible");
    }
    for (const p of this.groups.permissionsFor(request.tenant_id, request.actor)) perms.add(p);
    // Roles already imply permissions via the policy's hasElevated check; groups extend them.
    if (roles.length === 0 && perms.size === 0) return perms;
    return perms;
  }
}
