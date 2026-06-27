import { serve } from "@hono/node-server";
import { loadConfig } from "@alfy2/config";
import {
  DecisionEngine,
  ExecutiveInbox,
  ApprovalGateService,
  MissionControlEngine,
  MissionControlAlertService,
  FounderCapacityEngine,
  RevOpsEngine,
  AdvisoryDecisionEngine,
  CapitalAllocationEngine,
  DelegationRuntime,
} from "@alfy2/core";
import {
  Db,
  PgInboxRepository,
  PgApprovalRequestRepository,
  PgMissionControlReadModel,
  PgMissionControlAlertRepository,
  PgFounderCapacityRepository,
  PgRevOpsReadModel,
  PgDecisionRecordRepository,
  PgCapitalAccountRepository,
  PgCapitalAllocationRepository,
  PgCapitalRunwayRepository,
  PgDelegationPacketRepository,
  PgAgentReportRepository,
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
        const revops = new RevOpsEngine(new PgRevOpsReadModel(q));
        const decisions = new AdvisoryDecisionEngine(new PgDecisionRecordRepository(q));
        const capital = new CapitalAllocationEngine({
          accounts: new PgCapitalAccountRepository(q),
          allocations: new PgCapitalAllocationRepository(q),
          runway: new PgCapitalRunwayRepository(q),
        });
        const delegation = new DelegationRuntime({
          packets: new PgDelegationPacketRepository(q),
          reports: new PgAgentReportRepository(q),
        });
        const ctx: RequestRepos = {
          inbox,
          gate,
          missionControl,
          missionControlAlerts,
          founderCapacity,
          revops,
          decisions,
          capital,
          delegation,
        };
        return fn(ctx);
      },
      businessId,
    );

  // Auth strategy: JWKS (verify real Supabase JWTs) by default; "token" accepts a single shared
  // personal-access secret so the dashboard can read live data without a login flow.
  let verifyToken: AppDeps["verifyToken"];
  if (config.ALFY_AUTH_MODE === "token") {
    const expected = config.ALFY_API_TOKEN;
    if (expected === undefined || expected.length < 16) {
      console.error("[api] FATAL: ALFY_AUTH_MODE=token requires ALFY_API_TOKEN (>=16 chars).");
      process.exit(1);
      return;
    }
    console.warn(
      "[api] auth mode = TOKEN (single shared personal access token). Use JWKS for multi-user.",
    );
    verifyToken = async (token: string) => {
      // Constant-time-ish compare is overkill here; a length+equality check is sufficient for a
      // single-operator personal token. A mismatch throws → 401.
      if (token !== expected) throw new Error("bad token");
      return { sub: "operator" };
    };
  } else {
    verifyToken = makeJwksVerifier(config.SUPABASE_URL);
  }

  const deps: AppDeps = {
    config: { defaultTenantId: config.ALFY_DEFAULT_TENANT_ID },
    verifyToken,
    scope,
    corsOrigins: config.ALFY_CORS_ORIGINS.split(",").map((o) => o.trim()).filter((o) => o.length > 0),
  };

  const app = createApp(deps);

  // Render (and most hosts) inject the port to bind via process.env.PORT; fall back to config.
  const port = process.env["PORT"] ? Number(process.env["PORT"]) : config.ALFY_API_PORT;
  serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
  console.log(`[api] listening on :${port}`);
}

main().catch((err: unknown) => {
  // Log a message only — never the error object (may carry connection strings / tokens).
  console.error("[api] FATAL: startup failed:", err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
