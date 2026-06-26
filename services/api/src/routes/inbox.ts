import { Hono } from "hono";
import { InboxDropSchema } from "@alfy2/shared";
import type { InboxItemStatus, InboxListFilter } from "@alfy2/core";
import type { AppDeps, AppEnv } from "../types.js";

const INBOX_STATUSES: readonly InboxItemStatus[] = [
  "new",
  "reviewed",
  "actioned",
  "archived",
];

function isInboxStatus(v: string): v is InboxItemStatus {
  return (INBOX_STATUSES as readonly string[]).includes(v);
}

/**
 * Executive Inbox routes (auth + tenant). Ingestion and status changes are internal-state actions —
 * not externally visible — so they are NOT approval-gated; they go straight to the engine inside the
 * tenant scope.
 */
export function inboxRoutes(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // POST /inbox/ingest — drop something in; the engine identifies, classifies, routes it.
  app.post("/inbox/ingest", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }

    const parsed = InboxDropSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
    }

    const processed = await deps.scope(tenantId, businessId, ({ inbox }) =>
      inbox.process(tenantId, parsed.data),
    );
    return c.json(processed, 201);
  });

  // GET /inbox?status=&limit= — list stored items, newest first.
  app.get("/inbox", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");

    const statusRaw = c.req.query("status");
    if (statusRaw !== undefined && !isInboxStatus(statusRaw)) {
      return c.json({ error: "invalid_status" }, 400);
    }

    const limitRaw = c.req.query("limit");
    let limit: number | undefined;
    if (limitRaw !== undefined) {
      const n = Number.parseInt(limitRaw, 10);
      if (!Number.isFinite(n) || n <= 0) {
        return c.json({ error: "invalid_limit" }, 400);
      }
      limit = n;
    }

    const filter: InboxListFilter = {
      ...(statusRaw !== undefined ? { statuses: [statusRaw] } : {}),
      ...(limit !== undefined ? { limit } : {}),
    };

    const items = await deps.scope(tenantId, businessId, ({ inbox }) =>
      inbox.listItems(tenantId, filter),
    );
    return c.json({ items }, 200);
  });

  // POST /inbox/:id/status — advance an item's workflow status (internal, not gated).
  app.post("/inbox/:id/status", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const id = c.req.param("id");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const status = (body as { status?: unknown } | null)?.status;
    if (typeof status !== "string" || !isInboxStatus(status)) {
      return c.json({ error: "invalid_status" }, 400);
    }

    await deps.scope(tenantId, businessId, ({ inbox }) =>
      inbox.markStatus(tenantId, id, status),
    );
    return c.json({ ok: true, id, status }, 200);
  });

  return app;
}
