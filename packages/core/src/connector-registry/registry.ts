import {
  ConnectorDescriptorSchema,
  type ConnectorDescriptor,
  type ConnectorHealth,
} from "@alfy2/shared";
import { CONNECTOR_BLUEPRINTS, type ConnectorBlueprint } from "./blueprints.js";

/**
 * The Connector Registry — modular, NOT hard-coded. Connectors are descriptors stored in the registry;
 * future connectors (including arbitrary MCP connectors) are added by installing a blueprint or
 * registering a full descriptor, with no code change. Tenant-scoped: reads only return the tenant's
 * connectors. Every connector carries permissions, authentication, risk level, allowed actions, the
 * businesses using it, health status, and last sync. See docs/adr/ADR-0012-router-and-connectors.md.
 */

export interface ConnectorRegistryOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class ConnectorRegistry {
  private readonly connectors = new Map<string, ConnectorDescriptor>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: ConnectorRegistryOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Install a known blueprint for a tenant. Overrides customize permissions, actions, businesses, etc. */
  install(
    tenantId: string,
    blueprintKey: string,
    overrides: Partial<ConnectorDescriptor> = {},
  ): ConnectorDescriptor {
    const bp: ConnectorBlueprint | undefined = CONNECTOR_BLUEPRINTS[blueprintKey];
    if (!bp) throw new Error(`Unknown connector blueprint: ${blueprintKey}`);
    const now = this.clock().toISOString();
    const descriptor: ConnectorDescriptor = ConnectorDescriptorSchema.parse({
      id: overrides.id ?? `${bp.kind}-${this.newId().slice(0, 8)}`,
      name: bp.name,
      kind: bp.kind,
      category: bp.category,
      authentication: bp.authentication,
      permissions: bp.permissions,
      risk_level: bp.risk_level,
      allowed_actions: bp.allowed_actions,
      businesses_using: [],
      health_status: "unknown",
      last_sync: null,
      enabled: true,
      created_at: now,
      ...overrides,
      // tenant_id is authoritative from the argument, never an override.
      tenant_id: tenantId,
    });
    this.connectors.set(descriptor.id, descriptor);
    return descriptor;
  }

  /** Register a fully custom connector (e.g. a future MCP connector with no blueprint). */
  register(raw: unknown): ConnectorDescriptor {
    const descriptor = ConnectorDescriptorSchema.parse(raw);
    this.connectors.set(descriptor.id, descriptor);
    return descriptor;
  }

  get(tenantId: string, id: string): ConnectorDescriptor | undefined {
    const c = this.connectors.get(id);
    return c && c.tenant_id === tenantId ? c : undefined;
  }

  list(tenantId: string): ConnectorDescriptor[] {
    return [...this.connectors.values()].filter((c) => c.tenant_id === tenantId);
  }

  byCategory(tenantId: string, category: string): ConnectorDescriptor[] {
    return this.list(tenantId).filter((c) => c.category === category);
  }

  byKind(tenantId: string, kind: string): ConnectorDescriptor[] {
    return this.list(tenantId).filter((c) => c.kind === kind);
  }

  /** Connectors a given business uses. */
  byBusiness(tenantId: string, businessId: string): ConnectorDescriptor[] {
    return this.list(tenantId).filter((c) => c.businesses_using.includes(businessId));
  }

  setHealth(tenantId: string, id: string, health: ConnectorHealth): ConnectorDescriptor {
    const c = this.require(tenantId, id);
    const updated = { ...c, health_status: health };
    this.connectors.set(id, updated);
    return updated;
  }

  recordSync(tenantId: string, id: string, at: Date = this.clock()): ConnectorDescriptor {
    const c = this.require(tenantId, id);
    const updated = { ...c, last_sync: at.toISOString(), health_status: "healthy" as ConnectorHealth };
    this.connectors.set(id, updated);
    return updated;
  }

  /** Attach a business to a connector (records "businesses using it"). */
  addBusiness(tenantId: string, id: string, businessId: string): ConnectorDescriptor {
    const c = this.require(tenantId, id);
    if (c.businesses_using.includes(businessId)) return c;
    const updated = { ...c, businesses_using: [...c.businesses_using, businessId] };
    this.connectors.set(id, updated);
    return updated;
  }

  private require(tenantId: string, id: string): ConnectorDescriptor {
    const c = this.get(tenantId, id);
    if (!c) throw new Error(`Unknown connector ${id} for tenant ${tenantId}`);
    return c;
  }
}
