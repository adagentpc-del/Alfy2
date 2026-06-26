import type { Role, Permission, Grant } from "@alfy2/shared";

/**
 * Tenant-scoped permission checking for the Founder Intelligence System.
 * Permissions are derived from a principal's role grants — and grants NEVER cross tenants: a grant in
 * tenant A grants nothing in tenant B. This is the only new behavioral code the multi-tenant
 * productization needed; every engine was already tenant-aware. See docs/FOUNDER_INTELLIGENCE_SYSTEM.md.
 */

/** What each role can do. Higher roles include everything below them, plus their own grants. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: ["memory.read", "dashboards.view", "knowledge.read"],
  member: [
    "memory.read",
    "memory.write",
    "dashboards.view",
    "knowledge.read",
    "knowledge.write",
    "automation.manage",
  ],
  admin: [
    "memory.read",
    "memory.write",
    "businesses.manage",
    "agents.manage",
    "dashboards.view",
    "automation.manage",
    "knowledge.read",
    "knowledge.write",
    "approve.irreversible",
  ],
  owner: [
    "memory.read",
    "memory.write",
    "businesses.manage",
    "agents.manage",
    "billing.manage",
    "permissions.manage",
    "dashboards.view",
    "automation.manage",
    "knowledge.read",
    "knowledge.write",
    "approve.irreversible",
  ],
};

export interface PermissionQuery {
  tenantId: string;
  principal: string;
  permission: Permission;
}

/**
 * Resolves whether a principal holds a permission, given the full set of grants. Tenant isolation is
 * enforced here: only grants whose `tenant_id` matches the query tenant are considered.
 */
export class PermissionChecker {
  constructor(private readonly grants: Grant[]) {}

  /** All roles a principal holds in a given tenant (cross-tenant grants are ignored). */
  rolesFor(tenantId: string, principal: string): Role[] {
    return this.grants
      .filter((g) => g.tenant_id === tenantId && g.principal === principal)
      .map((g) => g.role);
  }

  /** Every permission a principal has in a tenant, unioned across their roles. */
  permissionsFor(tenantId: string, principal: string): Set<Permission> {
    const perms = new Set<Permission>();
    for (const role of this.rolesFor(tenantId, principal)) {
      for (const p of ROLE_PERMISSIONS[role]) perms.add(p);
    }
    return perms;
  }

  /** Tenant-scoped permission check. Returns false for any principal/permission outside the tenant. */
  can(query: PermissionQuery): boolean {
    return this.permissionsFor(query.tenantId, query.principal).has(query.permission);
  }
}
