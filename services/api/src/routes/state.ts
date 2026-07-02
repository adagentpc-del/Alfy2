import { Hono } from "hono";
import { ModuleStateSyncInputSchema } from "@alfy2/shared";
import type { AppDeps, AppEnv } from "../types.js";

/**
 * Module-state + vault routes (auth + tenant). This is the server side of the SPA's custody layer:
 * the browser pushes its namespaced module documents here so work product survives devices and
 * cache clears, and parks whole-vault exports as append-only snapshots. Operator-internal reads and
 * writes of the operator's own working state — never externally visible — so not approval-gated
 * (`internal_action`). Credential-looking keys are rejected by ModuleStateService regardless of
 * what the client sends.
 */
export function stateRoutes(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // GET /state — per-namespace rollup (custody dashboard).
  app.get("/state", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const namespaces = await deps.scope(tenantId, businessId, ({ moduleState }) =>
      moduleState.namespaces(tenantId),
    );
    return c.json({ namespaces }, 200);
  });

  // GET /state/:namespace — all documents in one namespace.
  app.get("/state/:namespace", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const namespace = c.req.param("namespace");
    const entries = await deps.scope(tenantId, businessId, ({ moduleState }) =>
      moduleState.read(tenantId, namespace),
    );
    return c.json({ entries }, 200);
  });

  // POST /state/sync — upsert a batch of module documents. Per-entry rejection, never all-or-nothing.
  app.post("/state/sync", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = ModuleStateSyncInputSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid_input", detail: parsed.error.issues[0]?.message }, 400);
    }
    const result = await deps.scope(tenantId, businessId, ({ moduleState }) =>
      moduleState.sync(tenantId, parsed.data.entries),
    );
    return c.json(result, 200);
  });

  // POST /vault/snapshots — park one whole-vault export (append-only).
  app.post("/vault/snapshots", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    let body: { payload?: unknown; label?: unknown };
    try {
      body = (await c.req.json()) as { payload?: unknown; label?: unknown };
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    if (body.payload === undefined) return c.json({ error: "payload_required" }, 400);
    const label = typeof body.label === "string" ? body.label : "";
    try {
      const meta = await deps.scope(tenantId, businessId, ({ moduleState }) =>
        moduleState.saveSnapshot(tenantId, body.payload, label),
      );
      return c.json(meta, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "snapshot_failed";
      if (msg.startsWith("snapshot_too_large") || msg.startsWith("snapshot_rejected")) {
        return c.json({ error: msg }, 400);
      }
      throw err;
    }
  });

  // GET /vault/snapshots — history, newest first (meta only).
  app.get("/vault/snapshots", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const snapshots = await deps.scope(tenantId, businessId, ({ moduleState }) =>
      moduleState.listSnapshots(tenantId),
    );
    return c.json({ snapshots }, 200);
  });

  // GET /vault/snapshots/latest — the newest snapshot with payload (restore path).
  app.get("/vault/snapshots/latest", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const snapshot = await deps.scope(tenantId, businessId, ({ moduleState }) =>
      moduleState.latestSnapshot(tenantId),
    );
    return c.json({ snapshot }, 200);
  });

  return app;
}
