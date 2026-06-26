import type { MiddlewareHandler } from "hono";
import type { AppDeps, AppEnv } from "../types.js";

/**
 * Tenant resolution (runs after auth). Single-operator: the tenant is always
 * `deps.config.defaultTenantId`. An optional `x-business-id` header narrows the scope further.
 * Both are stashed on context; routes ALWAYS run inside `deps.scope(tenantId, businessId, …)`,
 * never against raw persistence (fail-closed).
 */
export function tenantMiddleware(deps: AppDeps): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const tenantId = deps.config.defaultTenantId;
    const headerBusiness = c.req.header("x-business-id");
    const businessId =
      headerBusiness !== undefined && headerBusiness.trim().length > 0
        ? headerBusiness.trim()
        : undefined;
    c.set("tenantId", tenantId);
    c.set("businessId", businessId);
    await next();
    return;
  };
}
