import { Hono } from "hono";
import type { AppDeps, AppEnv } from "../types.js";
import type { RecordCapacityInput } from "@alfy2/core";

const INT_FIELDS = [
  "energy",
  "stress",
  "focus",
  "meeting_load",
  "decision_fatigue",
  "context_switching",
  "emotional_load",
  "urgency",
  "build_intensity",
] as const;

/**
 * FounderOS routes (auth + tenant). A capacity check-in records the founder's current state; the
 * engine computes a 0..100 score and a recommended work mode, which Mission Control reads to decide
 * what to surface and when to interrupt. Read/write of the founder's own state — not externally
 * visible — so not approval-gated.
 */
export function founderRoutes(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // POST /founder/capacity — daily check-in; returns the scored snapshot + recommended mode.
  app.post("/founder/capacity", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");

    let body: Record<string, unknown>;
    try {
      body = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }

    const input: RecordCapacityInput = {};
    for (const f of INT_FIELDS) {
      const v = body[f];
      if (typeof v === "number" && Number.isFinite(v)) {
        (input as Record<string, unknown>)[f] = Math.trunc(v);
      }
    }
    if (typeof body["sleep_hours"] === "number" && Number.isFinite(body["sleep_hours"])) {
      input.sleep_hours = body["sleep_hours"];
    }
    if (Array.isArray(body["health_constraints"])) {
      input.health_constraints = body["health_constraints"].filter(
        (x): x is string => typeof x === "string",
      );
    }
    if (typeof body["do_not_interrupt"] === "boolean") {
      input.do_not_interrupt = body["do_not_interrupt"];
    }

    const snapshot = await deps.scope(tenantId, businessId, ({ founderCapacity }) =>
      founderCapacity.record(tenantId, input),
    );
    return c.json(snapshot, 201);
  });

  // GET /founder/capacity — the latest snapshot (null if none recorded yet).
  app.get("/founder/capacity", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const latest = await deps.scope(tenantId, businessId, ({ founderCapacity }) =>
      founderCapacity.getLatest(tenantId),
    );
    return c.json({ capacity: latest }, 200);
  });

  return app;
}
