import { Hono } from "hono";
import type { AppEnv } from "../types.js";

/** Liveness/readiness probes. No auth — these must answer before anything else is wired. */
export function healthRoutes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.get("/healthz", (c) => c.json({ ok: true }, 200));
  app.get("/readyz", (c) => c.json({ ok: true, ready: true }, 200));
  return app;
}
