import {
  PermissionGroupSchema,
  type PermissionGroup,
  type Permission,
} from "@alfy2/shared";

/**
 * Permission Groups — named bundles of permissions assignable to principals, layered on top of role
 * grants. A principal's effective permissions are the union of their role-derived permissions and
 * every group they belong to. Tenant-scoped; groups never cross tenants.
 */

export class PermissionGroupError extends Error {}

export interface CreateGroupInput {
  tenant_id: string;
  name: string;
  permissions?: Permission[];
  members?: string[];
}

export class PermissionGroupRegistry {
  private readonly groups = new Map<string, PermissionGroup>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  create(input: CreateGroupInput): PermissionGroup {
    const group = PermissionGroupSchema.parse({
      id: this.newId(),
      tenant_id: input.tenant_id,
      name: input.name,
      permissions: input.permissions ?? [],
      members: input.members ?? [],
      created_at: this.clock().toISOString(),
    });
    this.groups.set(group.id, group);
    return group;
  }

  get(tenantId: string, id: string): PermissionGroup | undefined {
    const g = this.groups.get(id);
    return g && g.tenant_id === tenantId ? g : undefined;
  }

  /** Add a principal to a group. */
  addMember(tenantId: string, id: string, principal: string): PermissionGroup {
    const g = this.require(tenantId, id);
    if (g.members.includes(principal)) return g;
    const updated: PermissionGroup = { ...g, members: [...g.members, principal] };
    this.groups.set(id, updated);
    return updated;
  }

  /** Remove a principal from a group. */
  removeMember(tenantId: string, id: string, principal: string): PermissionGroup {
    const g = this.require(tenantId, id);
    const updated: PermissionGroup = { ...g, members: g.members.filter((m) => m !== principal) };
    this.groups.set(id, updated);
    return updated;
  }

  /** Every permission a principal gains from group memberships in a tenant. */
  permissionsFor(tenantId: string, principal: string): Set<Permission> {
    const perms = new Set<Permission>();
    for (const g of this.groups.values()) {
      if (g.tenant_id === tenantId && g.members.includes(principal)) {
        for (const p of g.permissions) perms.add(p);
      }
    }
    return perms;
  }

  list(tenantId: string): PermissionGroup[] {
    return [...this.groups.values()].filter((g) => g.tenant_id === tenantId);
  }

  private require(tenantId: string, id: string): PermissionGroup {
    const g = this.get(tenantId, id);
    if (!g) throw new PermissionGroupError(`No permission group ${id} in tenant ${tenantId}.`);
    return g;
  }
}
