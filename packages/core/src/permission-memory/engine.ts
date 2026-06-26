import {
  RememberAccessInputSchema,
  AccessGrantMemorySchema,
  AccessCheckResultSchema,
  type RememberAccessInput,
  type AccessGrantMemory,
  type AccessCheckResult,
} from "@alfy2/shared";

/**
 * Permission Memory & Reuse (docs/adr/ADR-0146-permission-memory.md). remember() records an approved access
 * grant. check() decides whether Alfy² may reuse it silently, must verify it, must escalate (expired / revoked
 * / high-risk), or must request a new grant (missing) — only the last two route to the Human Touch Queue.
 * verify() refreshes last_verified_at; revoke() retires a grant. Deterministic. Tenant-scoped. Mutable store.
 */
export class PermissionMemory {
  private readonly grants = new Map<string, AccessGrantMemory>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  remember(tenantId: string, input: RememberAccessInput): AccessGrantMemory {
    const i = RememberAccessInputSchema.parse(input);
    const now = this.clock().toISOString();
    const grant = AccessGrantMemorySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      tool: i.tool,
      workspace: i.workspace,
      folder_path: i.folder_path,
      account: i.account,
      scope: i.scope,
      granted_at: now,
      expires_at: i.expires_at,
      risk_level: i.risk_level,
      renewal_trigger: i.renewal_trigger,
      last_verified_at: now,
      status: "active",
      created_at: now,
      updated_at: now,
    });
    this.grants.set(grant.id, grant);
    return grant;
  }

  /** Decide whether the requested tool access can be reused without re-asking Alyssa. */
  check(tenantId: string, tool: string, opts: { scope?: string } = {}): AccessCheckResult {
    const now = this.clock();
    const match = this.list(tenantId).find(
      (g) => g.tool === tool && (opts.scope ? g.scope === opts.scope : true) && g.status === "active",
    );

    if (!match) {
      return AccessCheckResultSchema.parse({
        tool,
        decision: "request_new",
        can_proceed: false,
        reason: `No remembered access for "${tool}" — queue a one-time grant in the Human Touch Queue.`,
      });
    }
    if (match.expires_at && new Date(match.expires_at) <= now) {
      return AccessCheckResultSchema.parse({
        tool,
        decision: "escalate",
        can_proceed: false,
        reason: `Access for "${tool}" expired — escalate for renewal.`,
      });
    }
    if (match.risk_level === "high") {
      return AccessCheckResultSchema.parse({
        tool,
        decision: "escalate",
        can_proceed: false,
        reason: `Access for "${tool}" is high-risk — re-confirm before reuse.`,
      });
    }
    return AccessCheckResultSchema.parse({
      tool,
      decision: "reuse",
      can_proceed: true,
      reason: `Reusing remembered access for "${tool}" — no need to ask again.`,
    });
  }

  verify(tenantId: string, id: string): AccessGrantMemory {
    const g = this.require(tenantId, id);
    const updated = AccessGrantMemorySchema.parse({
      ...g,
      last_verified_at: this.clock().toISOString(),
      updated_at: this.clock().toISOString(),
    });
    this.grants.set(id, updated);
    return updated;
  }

  revoke(tenantId: string, id: string): AccessGrantMemory {
    const g = this.require(tenantId, id);
    const updated = AccessGrantMemorySchema.parse({ ...g, status: "revoked", updated_at: this.clock().toISOString() });
    this.grants.set(id, updated);
    return updated;
  }

  get(tenantId: string, id: string): AccessGrantMemory | undefined {
    const g = this.grants.get(id);
    return g && g.tenant_id === tenantId ? g : undefined;
  }

  list(tenantId: string): AccessGrantMemory[] {
    return [...this.grants.values()].filter((g) => g.tenant_id === tenantId);
  }

  private require(tenantId: string, id: string): AccessGrantMemory {
    const g = this.get(tenantId, id);
    if (!g) throw new Error(`Access grant ${id} not found for tenant ${tenantId}.`);
    return g;
  }
}
