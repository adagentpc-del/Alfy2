import { Hono } from "hono";
import type { AppDeps, AppEnv } from "../types.js";
import type { EvaluateDecisionInput } from "@alfy2/core";
import { isUuid } from "../util.js";

/**
 * Revenue Operating System routes (auth + tenant): RevOps brief + fastest-path-to-cash, the advisory
 * Decision Engine, and Capital Allocation. Reads and recommendations only — Capital Allocation never
 * moves money (it persists recommendations the founder approves elsewhere), so these are not
 * approval-gated. A `business` query/body scopes to one business; omit for portfolio-wide.
 */
export function businessOpsRoutes(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // ---- RevOps -----------------------------------------------------------------------------------
  app.get("/revops/brief", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const business = c.req.query("business");
    const brief = await deps.scope(tenantId, businessId, ({ revops }) =>
      business !== undefined ? revops.brief(tenantId, business) : revops.brief(tenantId),
    );
    return c.json(brief, 200);
  });

  app.get("/revops/fastest-path", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const targetRaw = c.req.query("target");
    const target = targetRaw === undefined ? 6000 : Number.parseFloat(targetRaw);
    if (!Number.isFinite(target) || target <= 0) return c.json({ error: "invalid_target" }, 400);
    const business = c.req.query("business");
    const plan = await deps.scope(tenantId, businessId, ({ revops }) =>
      revops.fastestPath(tenantId, business !== undefined ? { target_usd: target, business } : { target_usd: target }),
    );
    return c.json(plan, 200);
  });

  // ---- Decision Engine --------------------------------------------------------------------------
  app.post("/decisions/evaluate", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    let body: Record<string, unknown>;
    try {
      body = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    if (typeof body["title"] !== "string" || typeof body["decision_type"] !== "string" ||
        typeof body["reversibility"] !== "string") {
      return c.json({ error: "title, decision_type and reversibility are required" }, 400);
    }
    const input = body as unknown as EvaluateDecisionInput;
    try {
      const record = await deps.scope(tenantId, businessId, ({ decisions }) =>
        decisions.evaluate(tenantId, input),
      );
      return c.json(record, 201);
    } catch {
      return c.json({ error: "invalid_decision_input" }, 400);
    }
  });

  app.get("/decisions", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const records = await deps.scope(tenantId, businessId, ({ decisions }) =>
      decisions.list(tenantId),
    );
    return c.json({ decisions: records }, 200);
  });

  app.post("/decisions/:id/decide", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const id = c.req.param("id");
    let body: { status?: unknown };
    try {
      body = (await c.req.json()) as { status?: unknown };
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const status = body.status;
    if (status !== "approved" && status !== "rejected" && status !== "deferred") {
      return c.json({ error: "status must be approved | rejected | deferred" }, 400);
    }
    await deps.scope(tenantId, businessId, ({ decisions }) =>
      decisions.decide(tenantId, id, { status }),
    );
    return c.json({ ok: true, id, status }, 200);
  });

  // ---- Capital Allocation (recommend-only — never moves money) ----------------------------------
  app.post("/capital/allocate", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    let body: Record<string, unknown>;
    try {
      body = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const business_id = body["business_id"];
    const inflow_usd = body["inflow_usd"];
    if (!isUuid(business_id) || typeof inflow_usd !== "number" || inflow_usd <= 0) {
      return c.json({ error: "a UUID business_id and a positive inflow_usd are required" }, 400);
    }
    const allocation = await deps.scope(tenantId, businessId, ({ capital }) =>
      capital.allocate(tenantId, { business_id, inflow_usd }),
    );
    return c.json(allocation, 201);
  });

  app.post("/capital/runway", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    let body: Record<string, unknown>;
    try {
      body = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const business_id = body["business_id"];
    const cash_usd = body["cash_usd"];
    const monthly_burn_usd = body["monthly_burn_usd"];
    const min_reserve_usd = body["min_reserve_usd"];
    if (!isUuid(business_id) || typeof cash_usd !== "number" ||
        typeof monthly_burn_usd !== "number" || typeof min_reserve_usd !== "number") {
      return c.json({ error: "a UUID business_id, cash_usd, monthly_burn_usd, min_reserve_usd required" }, 400);
    }
    const runway = await deps.scope(tenantId, businessId, ({ capital }) =>
      capital.computeRunway(tenantId, { business_id, cash_usd, monthly_burn_usd, min_reserve_usd }),
    );
    return c.json(runway, 201);
  });

  app.get("/capital/accounts", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const business_id = c.req.query("business_id");
    if (business_id === undefined) return c.json({ error: "business_id query required" }, 400);
    const accounts = await deps.scope(tenantId, businessId, ({ capital }) =>
      capital.listAccounts(tenantId, business_id),
    );
    return c.json({ accounts }, 200);
  });

  return app;
}
