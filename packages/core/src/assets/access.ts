import type { Asset, Role } from "@alfy2/shared";

/**
 * Permission gate for the Global Asset Library. Search spans all of a tenant's businesses, but each
 * asset is filtered by what the requesting principal may see — this is the "searchable globally while
 * maintaining permissions" rule. Reuses the tenancy roles (owner/admin/member/viewer). The engine
 * resolves a principal's roles via an injected resolver (backed by the PermissionChecker), or treats
 * a single operator as having full access when no resolver is given. See docs/GLOBAL_ASSET_LIBRARY.md.
 */

/** Resolve the roles a principal holds in a tenant (e.g. PermissionChecker.rolesFor). */
export type RoleResolver = (tenantId: string, principal: string) => Role[];

const isElevated = (roles: Role[]): boolean => roles.includes("owner") || roles.includes("admin");
const hasAnyGrant = (roles: Role[]): boolean => roles.length > 0;

/**
 * Can `principal` (with these roles) view `asset`?
 * - private        → only the owner or an elevated role (owner/admin).
 * - sensitive      → only an elevated role (e.g. api_key, regardless of visibility).
 * - tenant/business→ anyone with a grant in the tenant; archived/deprecated still visible to grant-holders.
 */
export function canViewAsset(asset: Asset, principal: string, roles: Role[]): boolean {
  if (asset.visibility === "private") {
    return asset.owner === principal || isElevated(roles);
  }
  if (asset.sensitive) {
    return isElevated(roles);
  }
  return hasAnyGrant(roles);
}
