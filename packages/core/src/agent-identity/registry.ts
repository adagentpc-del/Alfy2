import {
  IssueAgentIdentityInputSchema,
  AgentIdentitySchema,
  AgentAccessRequestSchema,
  ZeroTrustDecisionSchema,
  type IssueAgentIdentityInput,
  type AgentIdentity,
  type AgentAccessRequest,
  type ZeroTrustDecision,
  type AgentCapabilities,
  type AgentActionType,
} from "@alfy2/shared";

/**
 * Agent Identity & Zero Trust (docs/adr/ADR-0025-agent-identity-zero-trust.md). Every agent gets a
 * unique, scoped, revocable identity that starts deny-by-default / read-only: no money, no external
 * messages, no production changes, no deletion, no tools. Access is evaluated PER REQUEST — nothing is
 * trusted by default; a capability, tool, data namespace, or spend is allowed only if the identity
 * explicitly grants it and the request stays within its limits. Deterministic. Tenant-scoped.
 */

export class AgentIdentityError extends Error {}

export interface AgentIdentityRegistryOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

/** Map an action type to the capability flag that must be granted for it. */
const CAPABILITY_FOR: Partial<Record<AgentActionType, keyof AgentCapabilities>> = {
  write: "can_write",
  spend: "can_spend",
  external_comm: "can_external_comm",
  modify_production: "can_modify_production",
  delete: "can_delete",
};

export class AgentIdentityRegistry {
  private readonly identities = new Map<string, AgentIdentity>();
  /** tenant|agent_key → id. */
  private readonly byKey = new Map<string, string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: AgentIdentityRegistryOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Issue a new identity with secure defaults (read-only / no money / no external / no prod / no delete). */
  issue(tenantId: string, input: IssueAgentIdentityInput): AgentIdentity {
    const i = IssueAgentIdentityInputSchema.parse(input);
    const key = `${tenantId}|${i.agent_key}`;
    if (this.byKey.has(key)) throw new AgentIdentityError(`Agent key "${i.agent_key}" already exists in tenant.`);
    const now = this.clock().toISOString();
    const identity = AgentIdentitySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      agent_key: i.agent_key,
      display_name: i.display_name,
      role: i.role,
      scope: i.scope,
      // capabilities, limits, and requires_approval_for take their secure schema defaults.
      created_at: now,
      updated_at: now,
    });
    this.identities.set(identity.id, identity);
    this.byKey.set(key, identity.id);
    return identity;
  }

  /** Grant capabilities, tool access, data boundaries, and limits. Merges onto the identity. */
  grant(
    tenantId: string,
    agentKey: string,
    grant: {
      capabilities?: Partial<AgentCapabilities>;
      tool_access?: string[];
      data_boundaries?: string[];
      scope?: string[];
      spending_limit_usd?: number;
      external_comm_daily_limit?: number;
    },
  ): AgentIdentity {
    const id = this.requireId(tenantId, agentKey);
    const cur = this.identities.get(id)!;
    const next: AgentIdentity = AgentIdentitySchema.parse({
      ...cur,
      capabilities: { ...cur.capabilities, ...(grant.capabilities ?? {}) },
      tool_access: grant.tool_access ? unique([...cur.tool_access, ...grant.tool_access]) : cur.tool_access,
      data_boundaries: grant.data_boundaries ? unique([...cur.data_boundaries, ...grant.data_boundaries]) : cur.data_boundaries,
      scope: grant.scope ? unique([...cur.scope, ...grant.scope]) : cur.scope,
      spending_limit_usd: grant.spending_limit_usd ?? cur.spending_limit_usd,
      external_comm_daily_limit: grant.external_comm_daily_limit ?? cur.external_comm_daily_limit,
      updated_at: this.clock().toISOString(),
    });
    this.identities.set(id, next);
    return next;
  }

  /** Suspend an identity (temporarily denies everything). */
  suspend(tenantId: string, agentKey: string): AgentIdentity {
    return this.setStatus(tenantId, agentKey, "suspended");
  }

  /** Revoke an identity — terminal; it can no longer do anything. */
  revoke(tenantId: string, agentKey: string): AgentIdentity {
    return this.setStatus(tenantId, agentKey, "revoked");
  }

  get(tenantId: string, agentKey: string): AgentIdentity | undefined {
    const id = this.byKey.get(`${tenantId}|${agentKey}`);
    const idn = id ? this.identities.get(id) : undefined;
    return idn && idn.tenant_id === tenantId ? idn : undefined;
  }

  list(tenantId: string): AgentIdentity[] {
    return [...this.identities.values()].filter((i) => i.tenant_id === tenantId);
  }

  /**
   * Zero-trust evaluation of an access request. Deny by default. Reads are allowed for an active
   * identity; every other action needs the matching capability AND must stay within scope/limits.
   * Sensitive classes in `requires_approval_for` return needs_approval rather than allow.
   */
  evaluate(tenantId: string, request: AgentAccessRequest): ZeroTrustDecision {
    const r = AgentAccessRequestSchema.parse(request);
    const now = this.clock().toISOString();
    const idn = this.get(tenantId, r.agent_key);
    const deny = (reason: string): ZeroTrustDecision =>
      ZeroTrustDecisionSchema.parse({ agent_key: r.agent_key, action: r.action, decision: "deny", reasons: [reason], created_at: now });

    if (!idn) return deny(`No identity for agent "${r.agent_key}".`);
    if (idn.status !== "active") return deny(`Identity is ${idn.status}.`);

    const reasons: string[] = [];

    // Tool access.
    if (r.action === "use_tool") {
      if (r.tool === null) return deny("use_tool requires a tool.");
      if (!idn.tool_access.includes(r.tool)) return deny(`Tool "${r.tool}" is not in the agent's tool access.`);
      return allow(r, now, [`Tool "${r.tool}" is permitted.`]);
    }

    // Data boundary (applies to read/write).
    if (r.data_namespace !== null && idn.data_boundaries.length > 0 && !idn.data_boundaries.includes(r.data_namespace)) {
      return deny(`Data namespace "${r.data_namespace}" is outside the agent's data boundaries.`);
    }

    // Reads: allowed for an active identity within its data boundaries.
    if (r.action === "read") return allow(r, now, ["Read within data boundaries."]);

    // All other actions need the matching capability.
    const capKey = CAPABILITY_FOR[r.action];
    if (capKey && !idn.capabilities[capKey]) {
      return deny(`Agent lacks the "${capKey}" capability (deny-by-default).`);
    }

    // Spend: also bounded by the spending limit.
    if (r.action === "spend") {
      const amount = r.amount_usd ?? 0;
      if (amount > idn.spending_limit_usd) {
        return deny(`Spend $${amount} exceeds the agent's $${idn.spending_limit_usd} limit.`);
      }
      reasons.push(`Spend $${amount} within the $${idn.spending_limit_usd} limit.`);
    }

    // External comms: must have a non-zero daily limit.
    if (r.action === "external_comm" && idn.external_comm_daily_limit <= 0) {
      return deny("Agent has no external-communication allowance.");
    }

    // A sensitive class the identity flags for approval → needs_approval, not a bare allow.
    if (r.action_class !== null && idn.requires_approval_for.includes(r.action_class)) {
      return ZeroTrustDecisionSchema.parse({
        agent_key: r.agent_key,
        action: r.action,
        decision: "needs_approval",
        reasons: [`Capability granted, but ${r.action_class} requires approval for this agent.`, ...reasons],
        created_at: now,
      });
    }

    return allow(r, now, reasons.length ? reasons : ["Capability granted and within limits."]);
  }

  // --- internals ---

  private setStatus(tenantId: string, agentKey: string, status: AgentIdentity["status"]): AgentIdentity {
    const id = this.requireId(tenantId, agentKey);
    const cur = this.identities.get(id)!;
    if (cur.status === "revoked") throw new AgentIdentityError(`Identity "${agentKey}" is revoked.`);
    const next: AgentIdentity = { ...cur, status, updated_at: this.clock().toISOString() };
    this.identities.set(id, next);
    return next;
  }

  private requireId(tenantId: string, agentKey: string): string {
    const id = this.byKey.get(`${tenantId}|${agentKey}`);
    if (!id || this.identities.get(id)!.tenant_id !== tenantId) {
      throw new AgentIdentityError(`No identity for agent "${agentKey}" in tenant.`);
    }
    return id;
  }
}

function allow(r: AgentAccessRequest, now: string, reasons: string[]): ZeroTrustDecision {
  return ZeroTrustDecisionSchema.parse({ agent_key: r.agent_key, action: r.action, decision: "allow", reasons, created_at: now });
}

const unique = (xs: string[]): string[] => [...new Set(xs)];
