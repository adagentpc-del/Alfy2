import { Hono } from "hono";
import type { AppDeps, AppEnv } from "./types.js";
import { authMiddleware } from "./middleware/auth.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import { approvalGateMiddleware } from "./middleware/approval-gate.js";
import { healthRoutes } from "./routes/health.js";
import { inboxRoutes } from "./routes/inbox.js";
import { actionRoutes } from "./routes/actions.js";
import { approvalRoutes } from "./routes/approvals.js";
import { missionControlRoutes } from "./routes/mission-control.js";
import { founderRoutes } from "./routes/founder.js";
import { businessOpsRoutes } from "./routes/business-ops.js";
import { orgRoutes } from "./routes/org.js";

export type { AppDeps, AppEnv, AppVariables, RequestRepos } from "./types.js";
export { GATED_ROUTES } from "./middleware/approval-gate.js";

/**
 * Build the Alfy² HTTP gateway. Nothing is read from the environment here — `config`, the token
 * verifier, and the persistence runner (`scope`) are all injected via {@link AppDeps}. Production
 * wires JWKS + `Db.withTenant` in `main.ts`; tests inject a local verifier + in-memory repos.
 *
 * Pipeline for protected routes: auth → tenant → approval-gate → handler. Health is unauthenticated.
 */
export function createApp(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // Structured JSON for unexpected errors — never leak stack traces or secrets to the client.
  app.onError((err, c) => {
    console.error("[api] unhandled error", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "internal_error" }, 500);
  });

  app.notFound((c) => c.json({ error: "not_found" }, 404));

  // Liveness/readiness first, no auth.
  app.route("/", healthRoutes());

  // Everything else is authenticated, tenant-scoped, and gate-checked.
  app.use("*", authMiddleware(deps));
  app.use("*", tenantMiddleware(deps));
  app.use("*", approvalGateMiddleware(deps));

  app.route("/", inboxRoutes(deps));
  app.route("/", actionRoutes(deps));
  app.route("/", approvalRoutes(deps));
  app.route("/", missionControlRoutes(deps));
  app.route("/", founderRoutes(deps));
  app.route("/", businessOpsRoutes(deps));
  app.route("/", orgRoutes(deps));

  return app;
}
