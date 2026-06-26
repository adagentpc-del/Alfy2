import { z } from "zod";
import { RiskSeveritySchema } from "./idea-builder.js";

/**
 * Connector Registry contracts. Integrations are NOT hard-coded — each connector is a descriptor in
 * the registry, so current and FUTURE connectors (including arbitrary MCP connectors) are added as
 * data. `kind` and `category` are free strings, not enums, to keep it open-ended. Every connector
 * carries the operational metadata the operator needs. See docs/adr/ADR-0012-router-and-connectors.md.
 * Mirrored in workers (Pydantic).
 */

export const AuthMethodSchema = z.enum(["oauth2", "api_key", "token", "none", "mcp"]);
export type AuthMethod = z.infer<typeof AuthMethodSchema>;

export const ConnectorHealthSchema = z.enum(["healthy", "degraded", "down", "unknown"]);
export type ConnectorHealth = z.infer<typeof ConnectorHealthSchema>;

/** A registered connector (tenant-scoped installation). */
export const ConnectorDescriptorSchema = z.object({
  id: z.string().min(1),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  /** Free string so future connectors need no code: "github", "gmail", "stripe", "mcp", … */
  kind: z.string().min(1),
  /** Free string: "dev", "email", "calendar", "storage", "chat", "payments", "db", "docs", "crm", … */
  category: z.string().default(""),

  authentication: AuthMethodSchema,
  /** OAuth scopes / API permissions requested. */
  permissions: z.array(z.string()).default([]),
  risk_level: RiskSeveritySchema,
  /** The actions this connector is allowed to perform. */
  allowed_actions: z.array(z.string()).default([]),
  /** Business ids (within the tenant) using this connector. */
  businesses_using: z.array(z.string()).default([]),

  health_status: ConnectorHealthSchema.default("unknown"),
  last_sync: z.string().datetime().nullable().default(null),
  enabled: z.boolean().default(true),
  created_at: z.string().datetime(),
});
export type ConnectorDescriptor = z.infer<typeof ConnectorDescriptorSchema>;
