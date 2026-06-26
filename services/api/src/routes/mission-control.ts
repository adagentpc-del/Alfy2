import { Hono } from "hono";
import type { AppDeps, AppEnv } from "../types.js";

/**
 * Mission Control (Layer 0) routes (auth + tenant). Read-only: the engine composes a live snapshot +
 * alerts from the tenant's data and the operator views it. The only write actions on this surface
 * (acknowledge / escalate an alert) are added once alert persistence lands; for now this serves the
 * composed snapshot and the daily CEO brief.
 */
export function missionControlRoutes(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // GET /mission-control — the composed CEO snapshot + the persisted, actionable alert queue.
  app.get("/mission-control", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const result = await deps.scope(tenantId, businessId, async ({ missionControl, missionControlAlerts }) => {
      const { snapshot, alerts } = await missionControl.compose(tenantId, businessId);
      const active = await missionControlAlerts.sync(tenantId, businessId ?? null, alerts);
      return { snapshot, alerts: active };
    });
    return c.json(result, 200);
  });

  // POST /mission-control/alerts/:id/ack — acknowledge an alert.
  app.post("/mission-control/alerts/:id/ack", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const id = c.req.param("id");
    await deps.scope(tenantId, businessId, ({ missionControlAlerts }) =>
      missionControlAlerts.acknowledge(tenantId, id),
    );
    return c.json({ ok: true, id, status: "acknowledged" }, 200);
  });

  // POST /mission-control/alerts/:id/escalate — escalate an alert.
  app.post("/mission-control/alerts/:id/escalate", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const id = c.req.param("id");
    await deps.scope(tenantId, businessId, ({ missionControlAlerts }) =>
      missionControlAlerts.escalate(tenantId, id),
    );
    return c.json({ ok: true, id, status: "escalated" }, 200);
  });

  // GET /mission-control/brief — the plain-text daily CEO brief (§28.6).
  app.get("/mission-control/brief", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const brief = await deps.scope(tenantId, businessId, async ({ missionControl }) => {
      const { snapshot } = await missionControl.compose(tenantId, businessId);
      return missionControl.buildDailyBrief(snapshot);
    });
    return c.json({ brief }, 200);
  });

  return app;
}
