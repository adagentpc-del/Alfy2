import { Hono } from "hono";
import type { ApiApprovalRequestStatus } from "@alfy2/shared";
import type { ApprovalListFilter } from "@alfy2/core";
import type { AppDeps, AppEnv } from "../types.js";

const APPROVAL_STATUSES: readonly ApiApprovalRequestStatus[] = [
  "pending",
  "approved",
  "denied",
  "expired",
];

function isApprovalStatus(v: string): v is ApiApprovalRequestStatus {
  return (APPROVAL_STATUSES as readonly string[]).includes(v);
}

/**
 * The founder's gate actions (auth + tenant). Listing and deciding approvals ARE the human-in-the-loop
 * control surface, so they are NOT themselves gated — gating them would deadlock the system.
 */
export function approvalRoutes(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // GET /approvals?status=pending — list approval requests for this tenant.
  app.get("/approvals", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");

    const statusRaw = c.req.query("status");
    if (statusRaw !== undefined && !isApprovalStatus(statusRaw)) {
      return c.json({ error: "invalid_status" }, 400);
    }
    const filter: ApprovalListFilter = {
      ...(statusRaw !== undefined ? { statuses: [statusRaw] } : {}),
    };

    const approvals = await deps.scope(tenantId, businessId, ({ gate }) =>
      gate.list(tenantId, filter),
    );
    return c.json({ approvals }, 200);
  });

  // POST /approvals/:id/decide — record the operator's approve/deny decision.
  app.post("/approvals/:id/decide", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const userId = c.get("userId");
    const id = c.req.param("id");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const status = (body as { status?: unknown } | null)?.status;
    const reasonRaw = (body as { reason?: unknown } | null)?.reason;
    if (status !== "approved" && status !== "denied") {
      return c.json({ error: "invalid_status" }, 400);
    }
    const reason = typeof reasonRaw === "string" ? reasonRaw : undefined;

    await deps.scope(tenantId, businessId, ({ gate }) =>
      gate.decide(tenantId, id, {
        status,
        decided_by: userId,
        ...(reason !== undefined ? { reason } : {}),
      }),
    );
    return c.json({ ok: true, id, status }, 200);
  });

  return app;
}
