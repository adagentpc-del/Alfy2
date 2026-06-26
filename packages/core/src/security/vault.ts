import {
  SecretRefSchema,
  type SecretRef,
  type SecretKind,
  type SecretStatus,
} from "@alfy2/shared";

/**
 * The API key vault / secret manager. It stores REFERENCES and rotation metadata — never the secret
 * value (the value lives encrypted in the store/KMS that `location` points at; the schema pins
 * `value_stored` to the literal `false`). Supports registration, credential rotation, revocation, and
 * a due-for-rotation report. Tenant-scoped.
 */

export class SecretVaultError extends Error {}

export interface RegisterSecretInput {
  tenant_id: string;
  name: string;
  kind: SecretKind;
  /** Pointer into the encrypted store / KMS — never the value itself. */
  location: string;
  owner: string;
  rotation_period_days?: number;
}

const addDays = (from: Date, days: number): string =>
  new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

export class SecretVault {
  private readonly secrets = new Map<string, SecretRef>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Register a secret reference. Rejects anything that looks like a raw secret value. */
  register(input: RegisterSecretInput): SecretRef {
    const period = input.rotation_period_days ?? 90;
    const now = this.clock();
    const ref = SecretRefSchema.parse({
      id: this.newId(),
      tenant_id: input.tenant_id,
      name: input.name,
      kind: input.kind,
      location: input.location,
      owner: input.owner,
      status: "active",
      rotation_period_days: period,
      last_rotated_at: now.toISOString(),
      next_rotation_at: addDays(now, period),
      value_stored: false,
      created_at: now.toISOString(),
    });
    this.secrets.set(ref.id, ref);
    return ref;
  }

  get(tenantId: string, id: string): SecretRef | undefined {
    const s = this.secrets.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  /** Rotate a secret: records the rotation and schedules the next one. The value is rotated in the
   *  external store by the caller; here we only move the metadata forward. */
  rotate(tenantId: string, id: string): SecretRef {
    const s = this.require(tenantId, id);
    if (s.status === "revoked") throw new SecretVaultError(`Secret ${id} is revoked and cannot be rotated.`);
    const now = this.clock();
    const rotated: SecretRef = {
      ...s,
      status: "active",
      last_rotated_at: now.toISOString(),
      next_rotation_at: addDays(now, s.rotation_period_days),
    };
    this.secrets.set(id, rotated);
    return rotated;
  }

  /** Revoke a secret — it can no longer be used or rotated. */
  revoke(tenantId: string, id: string): SecretRef {
    const s = this.require(tenantId, id);
    const revoked: SecretRef = { ...s, status: "revoked" };
    this.secrets.set(id, revoked);
    return revoked;
  }

  /** Active secrets whose next rotation is at/before `asOf` (defaults to now) — the rotation worklist. */
  dueForRotation(tenantId: string, asOf?: Date): SecretRef[] {
    const cutoff = (asOf ?? this.clock()).getTime();
    return [...this.secrets.values()].filter(
      (s) =>
        s.tenant_id === tenantId &&
        s.status === "active" &&
        s.next_rotation_at !== null &&
        new Date(s.next_rotation_at).getTime() <= cutoff,
    );
  }

  list(tenantId: string, status?: SecretStatus): SecretRef[] {
    return [...this.secrets.values()].filter(
      (s) => s.tenant_id === tenantId && (status ? s.status === status : true),
    );
  }

  private require(tenantId: string, id: string): SecretRef {
    const s = this.get(tenantId, id);
    if (!s) throw new SecretVaultError(`No secret ${id} in tenant ${tenantId}.`);
    return s;
  }
}
