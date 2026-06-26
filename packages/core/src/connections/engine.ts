import {
  RegisterConnectorInputSchema,
  ConnectorDefinitionSchema,
  ConnectInputSchema,
  ConnectionSchema,
  ResolveConnectionInputSchema,
  ConnectionResolutionSchema,
  type RegisterConnectorInput,
  type ConnectorDefinition,
  type ConnectInput,
  type Connection,
  type ResolveConnectionInput,
  type ConnectionResolution,
} from "@alfy2/shared";

/** Thrown when connecting a provider that has not been registered in the catalog. */
export class UnknownConnectorError extends Error {
  constructor(provider: string) {
    super(`No connector definition for "${provider}". Register it first with registerConnector().`);
    this.name = "UnknownConnectorError";
  }
}

/**
 * Connections Hub (docs/adr/ADR-0154-connections.md). The Set up & Connect surface for the whole ecosystem.
 *
 *  - registerConnector(): add a connectable platform to the catalog AT RUNTIME — new platforms need no code
 *    change, just a registration.
 *  - connect(): create a scoped connection (master / business / personal). A connector that needs secrets
 *    lands in `pending_setup` until attachSecrets() records the SecretVault references (never raw values).
 *  - resolve(): the effective connection for a business+provider — the business's own connection if present,
 *    otherwise the master connection it inherits, otherwise "needs setup".
 *
 * Deterministic. Tenant-scoped. Mutable in-memory stores (Supabase repositories swap in behind this in
 * Phase 2). Composes the Connector Registry, Human Touch Queue, Permission Memory, and SecretVault.
 */
export class ConnectionsHub {
  private readonly definitions = new Map<string, ConnectorDefinition>(); // key: `${tenant}:${provider}`
  private readonly connections = new Map<string, Connection>(); // key: connection id
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- catalog ---------------------------------------------------------------

  /** Register or update a connectable platform. The catalog is data — add new platforms anytime. */
  registerConnector(tenantId: string, input: RegisterConnectorInput): ConnectorDefinition {
    const i = RegisterConnectorInputSchema.parse(input);
    const key = `${tenantId}:${i.provider}`;
    const now = this.clock().toISOString();
    const existing = this.definitions.get(key);
    const def = ConnectorDefinitionSchema.parse({
      id: existing?.id ?? this.newId(),
      tenant_id: tenantId,
      provider: i.provider,
      display_name: i.display_name,
      category: i.category,
      auth_kind: i.auth_kind,
      required_secret_keys: i.required_secret_keys,
      default_scopes: i.default_scopes,
      risk_level: i.risk_level,
      docs_url: i.docs_url,
      enabled: existing?.enabled ?? true,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });
    this.definitions.set(key, def);
    return def;
  }

  getConnector(tenantId: string, provider: string): ConnectorDefinition | undefined {
    return this.definitions.get(`${tenantId}:${provider}`);
  }

  listConnectors(tenantId: string, opts: { includeRetired?: boolean } = {}): ConnectorDefinition[] {
    return [...this.definitions.values()].filter(
      (d) => d.tenant_id === tenantId && (opts.includeRetired ? true : d.enabled),
    );
  }

  retireConnector(tenantId: string, provider: string): ConnectorDefinition {
    const def = this.getConnector(tenantId, provider);
    if (!def) throw new UnknownConnectorError(provider);
    const updated = ConnectorDefinitionSchema.parse({ ...def, enabled: false, updated_at: this.clock().toISOString() });
    this.definitions.set(`${tenantId}:${provider}`, updated);
    return updated;
  }

  // --- connections -----------------------------------------------------------

  /** Create (or update) a connection at a scope. Lands in pending_setup if the connector needs secrets. */
  connect(tenantId: string, input: ConnectInput): Connection {
    const i = ConnectInputSchema.parse(input);
    const def = this.getConnector(tenantId, i.provider);
    if (!def) throw new UnknownConnectorError(i.provider);

    const business_id = i.scope === "business" ? i.business_id : null;
    if (i.scope === "business" && !business_id) {
      throw new Error(`A business connection for "${i.provider}" requires a business_id.`);
    }

    const now = this.clock().toISOString();
    const existing = this.findConnection(tenantId, i.provider, i.scope, business_id);
    const needsSecrets = def.required_secret_keys.length > 0;
    const connection = ConnectionSchema.parse({
      id: existing?.id ?? this.newId(),
      tenant_id: tenantId,
      scope: i.scope,
      business_id,
      provider: i.provider,
      label: i.label || existing?.label || def.display_name,
      status: existing?.status === "connected" ? "connected" : needsSecrets ? "pending_setup" : "connected",
      granted_scopes: i.granted_scopes.length ? i.granted_scopes : existing?.granted_scopes ?? def.default_scopes,
      secret_refs: existing?.secret_refs ?? [],
      health: existing?.health ?? (needsSecrets ? 0 : 1),
      last_verified_at: existing?.last_verified_at ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });
    this.connections.set(connection.id, connection);
    return connection;
  }

  /** Record the SecretVault references for a connection and mark it connected. */
  attachSecrets(tenantId: string, connectionId: string, secretRefs: string[]): Connection {
    const c = this.require(tenantId, connectionId);
    const now = this.clock().toISOString();
    const updated = ConnectionSchema.parse({
      ...c,
      secret_refs: secretRefs,
      status: "connected",
      health: 1,
      last_verified_at: now,
      updated_at: now,
    });
    this.connections.set(connectionId, updated);
    return updated;
  }

  /** The secret keys still needed before this connection is usable. */
  missingSecretKeys(tenantId: string, connectionId: string): string[] {
    const c = this.require(tenantId, connectionId);
    const def = this.getConnector(tenantId, c.provider);
    if (!def) return [];
    return c.status === "connected" ? [] : def.required_secret_keys;
  }

  /** The effective connection for a business+provider: the business's own, else the inherited master. */
  resolve(tenantId: string, input: ResolveConnectionInput): ConnectionResolution {
    const i = ResolveConnectionInputSchema.parse(input);

    const business = i.business_id ? this.findConnection(tenantId, i.provider, "business", i.business_id) : undefined;
    if (business && business.status === "connected") {
      return this.resolution(i.provider, "business", business, true, `Using ${i.provider} connected for this business.`);
    }

    const master = this.findConnection(tenantId, i.provider, "master", null);
    if (master && master.status === "connected") {
      return this.resolution(i.provider, "master", master, true, `Inheriting the master ${i.provider} connection.`);
    }

    // Nothing usable — point at whatever exists that needs setup, most specific first.
    const pending = business ?? master;
    if (pending) {
      return this.resolution(i.provider, pending.scope === "business" ? "business" : "master", pending, false,
        `${i.provider} exists but is ${pending.status} — finish setup to use it.`);
    }
    return ConnectionResolutionSchema.parse({
      provider: i.provider, resolved_from: "none", connection_id: null, status: "not_connected",
      can_use: false, reason: `No ${i.provider} connection at the business or master level — set one up.`,
    });
  }

  verify(tenantId: string, connectionId: string, healthy: boolean): Connection {
    const c = this.require(tenantId, connectionId);
    const now = this.clock().toISOString();
    const updated = ConnectionSchema.parse({
      ...c,
      health: healthy ? 1 : 0,
      status: healthy ? "connected" : "error",
      last_verified_at: now,
      updated_at: now,
    });
    this.connections.set(connectionId, updated);
    return updated;
  }

  revoke(tenantId: string, connectionId: string): Connection {
    const c = this.require(tenantId, connectionId);
    const updated = ConnectionSchema.parse({ ...c, status: "revoked", health: 0, updated_at: this.clock().toISOString() });
    this.connections.set(connectionId, updated);
    return updated;
  }

  get(tenantId: string, connectionId: string): Connection | undefined {
    const c = this.connections.get(connectionId);
    return c && c.tenant_id === tenantId ? c : undefined;
  }

  list(tenantId: string): Connection[] {
    return [...this.connections.values()].filter((c) => c.tenant_id === tenantId);
  }

  listForBusiness(tenantId: string, businessId: string): Connection[] {
    return this.list(tenantId).filter((c) => c.scope === "business" && c.business_id === businessId);
  }

  listMaster(tenantId: string): Connection[] {
    return this.list(tenantId).filter((c) => c.scope === "master");
  }

  listPersonal(tenantId: string): Connection[] {
    return this.list(tenantId).filter((c) => c.scope === "personal");
  }

  // --- internals -------------------------------------------------------------

  private findConnection(
    tenantId: string,
    provider: string,
    scope: Connection["scope"],
    businessId: string | null,
  ): Connection | undefined {
    return this.list(tenantId).find(
      (c) => c.provider === provider && c.scope === scope && c.business_id === businessId,
    );
  }

  private resolution(
    provider: string,
    from: ConnectionResolution["resolved_from"],
    c: Connection,
    canUse: boolean,
    reason: string,
  ): ConnectionResolution {
    return ConnectionResolutionSchema.parse({
      provider, resolved_from: from, connection_id: c.id, status: c.status, can_use: canUse, reason,
    });
  }

  private require(tenantId: string, connectionId: string): Connection {
    const c = this.get(tenantId, connectionId);
    if (!c) throw new Error(`Connection ${connectionId} not found for tenant ${tenantId}.`);
    return c;
  }
}
