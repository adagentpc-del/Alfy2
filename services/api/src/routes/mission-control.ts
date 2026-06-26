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

  // GET /mission-control — the composed CEO snapshot + derived alerts.
  app.get("/mission-control", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const result = await deps.scope(tenantId, businessId, ({ missionControl }) =>
      missionControl.compose(tenantId, businessId),
    );
    return c.json(result, 200);
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
