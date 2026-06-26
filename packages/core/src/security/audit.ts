import {
  AuditEntrySchema,
  type AuditEntry,
  type SecurityDecisionKind,
  type AuditOutcome,
  type SensitiveActionClass,
  type Environment,
} from "@alfy2/shared";

/**
 * The append-only audit log. The Security Gate writes one entry for EVERY action it evaluates, so
 * there is a trail for everything — allowed, denied, or queued. Entries are immutable; the backing
 * table (security_audit) has no UPDATE/DELETE RLS policy. Tenant-scoped.
 */

export interface AuditInput {
  tenant_id: string;
  actor: string;
  is_agent?: boolean;
  action: string;
  action_class?: SensitiveActionClass | null;
  resource?: string;
  target_env?: Environment;
  decision: SecurityDecisionKind;
  outcome?: AuditOutcome;
  metadata?: Record<string, unknown>;
}

export class AuditLog {
  private readonly entries: AuditEntry[] = [];
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Append one immutable audit entry and return it. */
  record(input: AuditInput): AuditEntry {
    const entry = AuditEntrySchema.parse({
      id: this.newId(),
      tenant_id: input.tenant_id,
      at: this.clock().toISOString(),
      actor: input.actor,
      is_agent: input.is_agent ?? false,
      action: input.action,
      action_class: input.action_class ?? null,
      resource: input.resource ?? "",
      target_env: input.target_env ?? "dev",
      decision: input.decision,
      outcome: input.outcome ?? "evaluated",
      metadata: input.metadata ?? {},
    });
    this.entries.push(entry);
    return entry;
  }

  /** Every entry for a tenant, newest last (insertion order). Cross-tenant entries are never returned. */
  list(tenantId: string): AuditEntry[] {
    return this.entries.filter((e) => e.tenant_id === tenantId);
  }

  /** Entries for a specific resource — the trail for one thing. */
  forResource(tenantId: string, resource: string): AuditEntry[] {
    return this.entries.filter((e) => e.tenant_id === tenantId && e.resource === resource);
  }

  /** Total count (all tenants) — for testing/metrics. */
  get size(): number {
    return this.entries.length;
  }
}
