import type {
  ActionRequest,
  SensitiveActionClass,
  SecurityDecisionKind,
  Role,
  Permission,
} from "@alfy2/shared";

/**
 * The security policy — the deterministic rules behind the Security Gate. Everything follows least
 * privilege; new agents default to read-only. The six sensitive action classes can NEVER execute
 * without explicit approval, regardless of who asks. Money/production/deletion/contract safeguards
 * layer on top. No AI is involved — this is pure, explainable rule evaluation.
 * See docs/adr/ADR-0015-enterprise-security.md.
 */

/** The six action classes that ALWAYS require explicit approval — nothing may do these unattended. */
export const SENSITIVE_ACTION_CLASSES: readonly SensitiveActionClass[] = [
  "spend_money",
  "delete_data",
  "modify_production",
  "contact_external",
  "sign_contract",
  "install_package",
] as const;

/** Human-readable reason for each sensitive class. */
const SENSITIVE_REASON: Record<SensitiveActionClass, string> = {
  spend_money: "Spending money always requires explicit approval.",
  delete_data: "Deleting data always requires explicit approval (deletion safeguard).",
  modify_production: "Modifying production always requires explicit approval (production protection).",
  contact_external: "Contacting external users always requires explicit approval.",
  sign_contract: "Signing contracts always requires explicit approval (contract safeguard).",
  install_package: "Installing packages always requires explicit approval.",
};

/** Who must approve each sensitive class (money escalates by amount — see policy below). */
const SENSITIVE_APPROVER: Record<SensitiveActionClass, Role> = {
  spend_money: "admin",
  delete_data: "admin",
  modify_production: "owner",
  contact_external: "admin",
  sign_contract: "owner",
  install_package: "admin",
};

/** Spend at or above this many USD escalates the required approver to the owner (money controls). */
export const MONEY_OWNER_THRESHOLD_USD = 1000;

/** The permission a write to each scope conceptually needs (for least-privilege checks on humans). */
export interface PolicyConfig {
  moneyOwnerThresholdUsd: number;
  protectedEnvs: readonly string[];
}

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  moneyOwnerThresholdUsd: MONEY_OWNER_THRESHOLD_USD,
  protectedEnvs: ["production"],
};

export interface PolicyContext {
  /** Roles the actor holds in this tenant (empty for unknown principals / agents with no grant). */
  roles: Role[];
  /** Effective permissions for the actor (from roles + permission groups). */
  permissions: Set<Permission>;
}

export interface PolicyVerdict {
  decision: SecurityDecisionKind;
  reasons: string[];
  /** Minimum role required to approve, when the decision is requires_approval. */
  requiredRole: Role;
}

const ELEVATED: readonly Role[] = ["owner", "admin"];
const hasElevated = (roles: Role[]): boolean => roles.some((r) => ELEVATED.includes(r));
/** A permission that authorizes mutation (anything `.write` / `.manage`, plus the irreversible gate). */
const isWriteBearing = (p: Permission): boolean =>
  p.endsWith(".write") || p.endsWith(".manage") || p === "approve.irreversible";
const hasWritePermission = (perms: Set<Permission>): boolean => [...perms].some(isWriteBearing);
/** Higher role wins when escalating an approver. */
const maxRole = (a: Role, b: Role): Role => (a === "owner" || b === "owner" ? "owner" : a === "admin" || b === "admin" ? "admin" : a);

/**
 * Evaluate a request under least privilege. Order matters: sensitive classes and production are
 * non-negotiable (always require approval) and are collected first; only a clean, permitted,
 * non-production write or any read can be allowed outright.
 */
export function evaluate(
  request: ActionRequest,
  ctx: PolicyContext,
  config: PolicyConfig = DEFAULT_POLICY_CONFIG,
): PolicyVerdict {
  const reasons: string[] = [];
  let requiresApproval = false;
  let requiredRole: Role = "admin";

  // 1. The six forbidden classes — always require approval, regardless of role.
  if (request.action_class) {
    requiresApproval = true;
    reasons.push(SENSITIVE_REASON[request.action_class]);
    requiredRole = maxRole(requiredRole, SENSITIVE_APPROVER[request.action_class]);
    // Money controls: large spend escalates to owner approval.
    if (
      request.action_class === "spend_money" &&
      request.amount_usd !== null &&
      request.amount_usd >= config.moneyOwnerThresholdUsd
    ) {
      reasons.push(`Spend of $${request.amount_usd} is at or above the $${config.moneyOwnerThresholdUsd} owner-approval threshold.`);
      requiredRole = "owner";
    }
  }

  // 2. Production protection — any write to a protected environment requires approval.
  if (request.effect === "write" && config.protectedEnvs.includes(request.target_env)) {
    requiresApproval = true;
    reasons.push(`Targets ${request.target_env} (production protection).`);
    requiredRole = maxRole(requiredRole, "owner");
  }

  // 3. Least privilege on writes.
  if (request.effect === "write") {
    if (request.is_agent) {
      // Default every agent to read-only: an agent write is never auto-allowed.
      requiresApproval = true;
      reasons.push("Agents are read-only by default; writes require explicit approval.");
    } else if (ctx.roles.length === 0 && ctx.permissions.size === 0) {
      // Unknown principal with no grant at all → deny outright (least privilege).
      return {
        decision: "deny",
        reasons: ["Actor holds no permissions in this tenant; least privilege denies the write."],
        requiredRole,
      };
    } else if (!hasElevated(ctx.roles) && !hasWritePermission(ctx.permissions)) {
      // Has a grant (e.g. viewer) but no write-bearing permission → must be approved.
      requiresApproval = true;
      reasons.push("Actor lacks a write permission for this action; approval required (least privilege).");
    }
  } else {
    // Reads: a principal with no grant at all is denied (least privilege); otherwise allowed.
    if (!request.is_agent && ctx.roles.length === 0 && ctx.permissions.size === 0) {
      return {
        decision: "deny",
        reasons: ["Actor holds no grant in this tenant; least privilege denies the read."],
        requiredRole,
      };
    }
  }

  if (requiresApproval) {
    return { decision: "requires_approval", reasons, requiredRole };
  }
  return {
    decision: "allow",
    reasons: reasons.length ? reasons : ["Permitted read/write under least privilege."],
    requiredRole,
  };
}

/** Is this action one of the six that may never run unattended? */
export function isSensitive(actionClass: SensitiveActionClass | null): boolean {
  return actionClass !== null && SENSITIVE_ACTION_CLASSES.includes(actionClass);
}
