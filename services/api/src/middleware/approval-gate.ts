import type { Context, MiddlewareHandler } from "hono";
import type { ApiApprovalActionClass } from "@alfy2/shared";
import type { AppDeps, AppEnv } from "../types.js";

/**
 * A state-changing, risky route that may not run until the founder has approved it. The gate is
 * deny-by-default: a matching route with no valid approval token is parked as a pending request
 * (HTTP 202) instead of executing.
 */
export interface GatedRoute {
  method: string;
  path: string;
  action_class: ApiApprovalActionClass;
  /** Human-readable summary of the pending action, derived from the request. */
  summarize: (c: Context<AppEnv>) => string;
}

/**
 * The registry of gated routes. Keep this the single source of truth for what the gateway parks for
 * approval. Anything not listed here passes straight through (non-gated).
 */
export const GATED_ROUTES: readonly GatedRoute[] = [
  {
    method: "POST",
    path: "/actions/send-email",
    action_class: "send_message",
    summarize: (c) => {
      const business = c.req.header("x-business-id");
      return `Send an email${business ? ` (business ${business})` : ""}.`;
    },
  },
];

function matchGated(method: string, path: string): GatedRoute | undefined {
  const m = method.toUpperCase();
  return GATED_ROUTES.find((r) => r.method.toUpperCase() === m && r.path === path);
}

/**
 * Approval gate middleware. For a matched gated route:
 *  - if the request carries `?approval_id=<id>` or header `x-approval-id` that resolves to an
 *    `approved` request for this tenant → allow through;
 *  - otherwise create a pending request and respond `202 { status:"approval_required", approval_id, risk }`.
 * Default-deny: any unknown/unapproved gated state is blocked. Non-gated routes pass untouched.
 */
export function approvalGateMiddleware(deps: AppDeps): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const gated = matchGated(c.req.method, c.req.path);
    if (!gated) {
      await next();
      return;
    }

    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const userId = c.get("userId");

    const approvalId =
      c.req.query("approval_id") ?? c.req.header("x-approval-id") ?? undefined;

    // If an approval token is supplied, it must resolve to an APPROVED request for this tenant that
    // was issued for THIS exact route + method + action class — and it is consumed (one-time use) so
    // it cannot be replayed or reused to unlock a different gated action.
    if (approvalId !== undefined && approvalId.trim().length > 0) {
      const ok = await deps.scope(tenantId, businessId, async ({ gate }) => {
        const req = await gate.get(tenantId, approvalId.trim());
        const bound =
          req !== null &&
          req.status === "approved" &&
          req.route === gated.path &&
          req.method.toUpperCase() === gated.method.toUpperCase() &&
          req.action_class === gated.action_class;
        if (!bound || req === null) return false;
        await gate.consume(tenantId, req.id); // one-time use
        return true;
      });
      if (ok) {
        await next();
        return;
      }
      // Supplied but not valid/approved/bound (or already consumed) → fall through to default-deny.
    }

    // Default-deny: park a pending approval request and tell the caller.
    const summary = gated.summarize(c);
    const { approvalId: createdId, risk } = await deps.scope(
      tenantId,
      businessId,
      async ({ gate }) => {
        const req = await gate.requireApproval(tenantId, {
          action_class: gated.action_class,
          method: gated.method,
          route: gated.path,
          summary,
          requested_by: userId,
          ...(businessId !== undefined ? { business_id: businessId } : {}),
        });
        return { approvalId: req.id, risk: req.risk };
      },
    );

    return c.json(
      { status: "approval_required", approval_id: createdId, risk },
      202,
    );
  };
}
