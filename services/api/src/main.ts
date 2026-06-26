import { serve } from "@hono/node-server";
import { loadConfig } from "@alfy2/config";
import {
  DecisionEngine,
  ExecutiveInbox,
  ApprovalGateService,
  MissionControlEngine,
  MissionControlAlertService,
  FounderCapacityEngine,
} from "@alfy2/core";
import {
  Db,
  PgInboxRepository,
  PgApprovalRequestRepository,
  PgMissionControlReadModel,
  PgMissionControlAlertRepository,
  PgFounderCapacityRepository,
} from "@alfy2/db";
import { createApp } from "./app.js";
import { makeJwksVerifier } from "./auth/jwks.js";
import type { AppDeps, RequestRepos } from "./types.js";

/**
 * Production entrypoint. Reads config (the only env read in the whole service), builds a
 * tenant-scoped persistence runner over `Db.withTenant` + Pg repositories, wires the Supabase JWKS
 * verifier, and serves. Startup never prints secrets.
 */
async function main(): Promise<void> {
  const config = loadConfig();

  if (config.DATABASE_URL === undefined || config.DATABASE_URL.length === 0) {
    // Fatal, but never echo any secret/connection material.
    console.error("[api] FATAL: DATABASE_URL required to serve; set it in .env");
    process.exit(1);
    return;
  }

  const db = new Db({ connectionString: config.DATABASE_URL });

  // One DecisionEngine is shared (deterministic, stateless); repos are per-transaction.
  const decisions = new DecisionEngine();

  const scope: AppDeps["scope"] = (tenantId, businessId, fn) =>
    db.withTenant(
      tenantId,
      (q) => {
        const inbox = new ExecutiveInbox(decisions, {
          inbox: new PgInboxRepository(q),
        });
        const gate = new ApprovalGateService(new PgApprovalRequestRepository(q));
        const missionControl = new MissionControlEngine(new PgMissionControlReadModel(q));
        const missionControlAlerts = new MissionControlAlertService(
          new PgMissionControlAlertRepository(q),
        );
        const founderCapacity = new FounderCapacityEngine(new PgFounderCapacityRepository(q));
        const ctx: RequestRepos = {
          inbox,
          gate,
          missionControl,
          missionControlAlerts,
          founderCapacity,
        };
        return fn(ctx);
      },
      businessId,
    );

  const deps: AppDeps = {
    config: { defaultTenantId: config.ALFY_DEFAULT_TENANT_ID },
    verifyToken: makeJwksVerifier(config.SUPABASE_URL),
    scope,
  };

  const app = createApp(deps);

  serve({ fetch: app.fetch, port: config.ALFY_API_PORT });
  console.log(`[api] listening on :${config.ALFY_API_PORT}`);
}

main().catch((err: unknown) => {
  // Log a message only — never the error object (may carry connection strings / tokens).
  console.error("[api] FATAL: startup failed:", err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
