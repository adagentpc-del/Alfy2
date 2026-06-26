import { SessionSchema, type Session } from "@alfy2/shared";

/**
 * Session management. Sessions are tenant-scoped, expire, and can be revoked individually or in bulk
 * for a principal (e.g. on credential compromise). `validate` enforces expiry and revocation.
 */

export class SessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Open a session for a principal that expires after `ttlSeconds`. */
  create(
    tenantId: string,
    principal: string,
    ttlSeconds: number,
    opts: { ip?: string | null; scopes?: string[] } = {},
  ): Session {
    const now = this.clock();
    const session = SessionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      principal,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      last_seen_at: now.toISOString(),
      revoked: false,
      ip: opts.ip ?? null,
      scopes: opts.scopes ?? [],
    });
    this.sessions.set(session.id, session);
    return session;
  }

  get(tenantId: string, id: string): Session | undefined {
    const s = this.sessions.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  /** True only if the session exists, is unrevoked, and has not expired (as of `now`). */
  validate(tenantId: string, id: string, now?: Date): boolean {
    const s = this.get(tenantId, id);
    if (!s || s.revoked) return false;
    const at = (now ?? this.clock()).getTime();
    return new Date(s.expires_at).getTime() > at;
  }

  /** Refresh last-seen on an active session. No-op for invalid sessions. */
  touch(tenantId: string, id: string, now?: Date): Session | undefined {
    const s = this.get(tenantId, id);
    if (!s || !this.validate(tenantId, id, now)) return undefined;
    const touched: Session = { ...s, last_seen_at: (now ?? this.clock()).toISOString() };
    this.sessions.set(id, touched);
    return touched;
  }

  /** Revoke a single session. */
  revoke(tenantId: string, id: string): void {
    const s = this.get(tenantId, id);
    if (s) this.sessions.set(id, { ...s, revoked: true });
  }

  /** Revoke every session for a principal — returns how many were revoked. */
  revokeAll(tenantId: string, principal: string): number {
    let count = 0;
    for (const s of this.sessions.values()) {
      if (s.tenant_id === tenantId && s.principal === principal && !s.revoked) {
        this.sessions.set(s.id, { ...s, revoked: true });
        count += 1;
      }
    }
    return count;
  }

  /** Active (unrevoked, unexpired) sessions for a tenant. */
  active(tenantId: string, now?: Date): Session[] {
    return [...this.sessions.values()].filter((s) => this.validate(tenantId, s.id, now));
  }
}
