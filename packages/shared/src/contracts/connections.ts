import { z } from "zod";

/**
 * Connections layer — the "Set up & Connect" surface for the whole ecosystem. Every external piece (email,
 * social, Slack, calendar, payments, storage, AI, or any future platform) is connected here at one of three
 * SCOPES: master (a platform-wide default shared by every business), business (scoped to one business_id), or
 * personal (Alyssa's own pieces). A business connection overrides the master; if a business has none, it
 * inherits the master. New platforms can be added at runtime by registering a ConnectorDefinition — the
 * catalog is data, never a hard-coded enum, so a new platform is a registration, not a code change. Secrets
 * are stored as REFERENCES into the SecretVault, never as values. Composes the Connector Registry (ADR-0012),
 * Human Touch Queue (ADR-0145), Permission Memory (ADR-0146), and the SecretVault (ADR-0015). MUTABLE records.
 * See docs/adr/ADR-0154-connections.md. Mirrored in workers.
 */

/** The three connection scopes. master cascades to every business unless a business overrides it. */
export const ConnectionScopeSchema = z.enum(["master", "business", "personal"]);
export type ConnectionScope = z.infer<typeof ConnectionScopeSchema>;

export const ConnectionStatusSchema = z.enum([
  "not_connected", "pending_setup", "connected", "error", "expired", "revoked",
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

/** How a connector authenticates — drives what the setup step (Human Touch Queue) asks for. */
export const ConnectorAuthKindSchema = z.enum(["oauth2", "api_key", "webhook", "basic", "none"]);
export type ConnectorAuthKind = z.infer<typeof ConnectorAuthKindSchema>;

export const ConnectorRiskLevelSchema = z.enum(["low", "medium", "high"]);
export type ConnectorRiskLevel = z.infer<typeof ConnectorRiskLevelSchema>;

// ----------------------------------------------------------------------------
// Connector catalog — the registry of WHAT can be connected. Extensible at runtime.
// ----------------------------------------------------------------------------

export const RegisterConnectorInputSchema = z.object({
  /** Stable provider id (e.g. "gmail", "resend", "instagram", "x", "slack", or any new platform). */
  provider: z.string().min(1),
  display_name: z.string().min(1),
  /** Free-text category so new kinds need no enum change (e.g. "email", "social", "chat", "payments"). */
  category: z.string().min(1),
  auth_kind: ConnectorAuthKindSchema,
  /** Env/secret keys this connector needs (stored as references, never values). */
  required_secret_keys: z.array(z.string()).default([]),
  default_scopes: z.array(z.string()).default([]),
  risk_level: ConnectorRiskLevelSchema.default("low"),
  docs_url: z.string().default(""),
});
export type RegisterConnectorInput = z.infer<typeof RegisterConnectorInputSchema>;

/** A connectable platform in the catalog. Mutable — editable as a platform's requirements change. */
export const ConnectorDefinitionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  provider: z.string().min(1),
  display_name: z.string().min(1),
  category: z.string().min(1),
  auth_kind: ConnectorAuthKindSchema,
  required_secret_keys: z.array(z.string()).default([]),
  default_scopes: z.array(z.string()).default([]),
  risk_level: ConnectorRiskLevelSchema.default("low"),
  docs_url: z.string().default(""),
  /** False to retire a connector from the catalog without deleting it. */
  enabled: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ConnectorDefinition = z.infer<typeof ConnectorDefinitionSchema>;

// ----------------------------------------------------------------------------
// Connection instances — an actual connection at a scope, with its own credentials.
// ----------------------------------------------------------------------------

export const ConnectInputSchema = z.object({
  scope: ConnectionScopeSchema,
  /** Required when scope is "business"; null for master/personal. */
  business_id: z.string().uuid().nullable().default(null),
  provider: z.string().min(1),
  label: z.string().default(""),
  granted_scopes: z.array(z.string()).default([]),
});
export type ConnectInput = z.infer<typeof ConnectInputSchema>;

/** A scoped connection. Move Mi's email and StrataLogic's email are two separate rows with separate secrets. */
export const ConnectionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  scope: ConnectionScopeSchema,
  business_id: z.string().uuid().nullable().default(null),
  provider: z.string().min(1),
  label: z.string().default(""),
  status: ConnectionStatusSchema.default("not_connected"),
  granted_scopes: z.array(z.string()).default([]),
  /** References into the SecretVault — never raw secret values. */
  secret_refs: z.array(z.string()).default([]),
  /** 0..1 — connection health from the last verification. */
  health: z.number().min(0).max(1).default(0),
  last_verified_at: z.string().datetime().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Connection = z.infer<typeof ConnectionSchema>;

// ----------------------------------------------------------------------------
// Resolution — the effective connection for a business+provider (business → master).
// ----------------------------------------------------------------------------

export const ResolveConnectionInputSchema = z.object({
  provider: z.string().min(1),
  /** The business asking; null resolves master/personal only. */
  business_id: z.string().uuid().nullable().default(null),
});
export type ResolveConnectionInput = z.infer<typeof ResolveConnectionInputSchema>;

export const ConnectionResolutionSchema = z.object({
  provider: z.string().min(1),
  /** Where the effective connection came from. */
  resolved_from: z.enum(["business", "master", "personal", "none"]),
  connection_id: z.string().uuid().nullable().default(null),
  status: ConnectionStatusSchema,
  /** True when a connected, usable connection was found (directly or via master fallback). */
  can_use: z.boolean(),
  reason: z.string().min(1),
});
export type ConnectionResolution = z.infer<typeof ConnectionResolutionSchema>;
