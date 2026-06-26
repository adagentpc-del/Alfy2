import { Hono } from "hono";
import type { AppDeps, AppEnv } from "../types.js";

/**
 * Outbound action routes. These are GATED by the approval-gate middleware — the handler only runs
 * once a matching approved request is supplied. No connector is wired yet, so an approved send is
 * merely acknowledged; this route exists to prove the gate end-to-end.
 */
export function actionRoutes(_deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // POST /actions/send-email — gated (send_message). Reaches here only when approved.
  app.post("/actions/send-email", (c) =>
    c.json(
      { sent: false, note: "connector not yet wired; approved send acknowledged" },
      200,
    ),
  );

  return app;
}
