import { Hono } from "hono";
import type { AppDeps, AppEnv } from "../types.js";
import type { RuntimeIssuePacketInput, RuntimeSubmitReportInput } from "@alfy2/core";

/**
 * AI-Org routes (auth + tenant): the chain of command's operational core. A delegation packet is
 * issued, then accepted; an agent may only submit a report against an ACCEPTED packet (the
 * non-negotiable "no work without a packet" rule, enforced in the service). The receiving employee
 * reviews the report. Internal coordination — not externally visible — so not approval-gated.
 */
export function orgRoutes(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // POST /org/packets — issue a delegation packet.
  app.post("/org/packets", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    let body: Record<string, unknown>;
    try {
      body = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    if (typeof body["objective"] !== "string" || typeof body["assigned_agent"] !== "string") {
      return c.json({ error: "objective and assigned_agent are required" }, 400);
    }
    try {
      const packet = await deps.scope(tenantId, businessId, ({ delegation }) =>
        delegation.issuePacket(tenantId, body as unknown as RuntimeIssuePacketInput),
      );
      return c.json(packet, 201);
    } catch {
      return c.json({ error: "invalid_packet" }, 400);
    }
  });

  // POST /org/packets/:id/accept — accept a packet (work may begin once accepted).
  app.post("/org/packets/:id/accept", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const id = c.req.param("id");
    try {
      const packet = await deps.scope(tenantId, businessId, ({ delegation }) =>
        delegation.acceptPacket(tenantId, id),
      );
      return c.json(packet, 200);
    } catch {
      return c.json({ error: "packet_not_found" }, 404);
    }
  });

  // GET /org/packets — list packets.
  app.get("/org/packets", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const packets = await deps.scope(tenantId, businessId, ({ delegation }) =>
      delegation.listPackets(tenantId),
    );
    return c.json({ packets }, 200);
  });

  // GET /org/packets/:id/reports — reports filed against a packet.
  app.get("/org/packets/:id/reports", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const id = c.req.param("id");
    const reports = await deps.scope(tenantId, businessId, ({ delegation }) =>
      delegation.listReports(tenantId, id),
    );
    return c.json({ reports }, 200);
  });

  // POST /org/reports — submit a report; 409 if the packet isn't accepted (no work without a packet).
  app.post("/org/reports", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    let body: Record<string, unknown>;
    try {
      body = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const packetId = body["packet_id"];
    if (typeof packetId !== "string" || typeof body["agent"] !== "string") {
      return c.json({ error: "packet_id and agent are required" }, 400);
    }
    // Resolve packet state and submit in one transaction, so a real DB error surfaces as a generic
    // 500 (via onError) rather than being mislabelled 409 or leaking its message to the client.
    const result = await deps.scope(tenantId, businessId, async ({ delegation }) => {
      const packet = await delegation.getPacket(tenantId, packetId);
      if (packet === null) return { code: 404 as const, body: { error: "packet_not_found" } };
      if (packet.status !== "accepted") {
        return { code: 409 as const, body: { error: "no_accepted_packet" } };
      }
      const report = await delegation.submitReport(tenantId, body as unknown as RuntimeSubmitReportInput);
      return { code: 201 as const, body: report as unknown as Record<string, unknown> };
    });
    return c.json(result.body, result.code);
  });

  // POST /org/reports/:id/review — employee reviews a report.
  app.post("/org/reports/:id/review", async (c) => {
    const tenantId = c.get("tenantId");
    const businessId = c.get("businessId");
    const id = c.req.param("id");
    let body: { execution_status?: unknown; verification_status?: unknown };
    try {
      body = (await c.req.json()) as { execution_status?: unknown; verification_status?: unknown };
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    if (typeof body.execution_status !== "string" || typeof body.verification_status !== "string") {
      return c.json({ error: "execution_status and verification_status are required" }, 400);
    }
    try {
      const report = await deps.scope(tenantId, businessId, ({ delegation }) =>
        delegation.reviewReport(tenantId, id, {
          execution_status: body.execution_status as never,
          verification_status: body.verification_status as never,
        }),
      );
      return c.json(report, 200);
    } catch {
      return c.json({ error: "report_not_found" }, 404);
    }
  });

  return app;
}
