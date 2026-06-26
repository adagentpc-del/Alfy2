import type { PersistentApproval, ActionRequest } from "@alfy2/shared";

/**
 * Scope matching for standing grants. An action is covered by a grant only if the grant is live (not
 * expired / not due for review / not revoked) and EVERY set facet of its scope matches the action, and
 * the action stays within the grant's limits. Pure, deterministic predicates.
 */

/** Is the grant live as of `now` (active, not past expiry, not past a scheduled review)? */
export function isLive(approval: PersistentApproval, now: Date): boolean {
  if (approval.status !== "active") return false;
  const t = now.getTime();
  if (approval.expires_at !== null && new Date(approval.expires_at).getTime() <= t) return false;
  if (approval.next_review_at !== null && new Date(approval.next_review_at).getTime() <= t) return false;
  return true;
}

/** Does the action fall inside the grant's scope (every set facet matches)? */
export function matchesScope(approval: PersistentApproval, request: ActionRequest): boolean {
  const s = approval.scope;
  if (s.action_class !== null && s.action_class !== request.action_class) return false;
  if (s.action_pattern !== null && !request.action.toLowerCase().includes(s.action_pattern.toLowerCase())) {
    return false;
  }
  if (s.business_id !== null && request.metadata["business_id"] !== s.business_id) return false;
  if (!s.environments.includes(request.target_env)) return false;
  return true;
}

/** Is the action within the grant's quantitative limits (uses remaining, amount cap)? */
export function withinLimits(approval: PersistentApproval, request: ActionRequest): boolean {
  const l = approval.limits;
  if (l.max_uses !== null && l.used_count >= l.max_uses) return false;
  if (l.max_amount_usd !== null && request.amount_usd !== null && request.amount_usd > l.max_amount_usd) {
    return false;
  }
  return true;
}

/** A grant covers an action when it is live, in-scope, and within limits. */
export function covers(approval: PersistentApproval, request: ActionRequest, now: Date): boolean {
  return isLive(approval, now) && matchesScope(approval, request) && withinLimits(approval, request);
}
