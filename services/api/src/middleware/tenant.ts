import type { MiddlewareHandler } from "hono";
import type { AppDeps, AppEnv } from "../types.js";
import { isUuid } from "../util.js";

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
    let businessId: string | undefined;
    if (headerBusiness !== undefined && headerBusiness.trim().length > 0) {
      const trimmed = headerBusiness.trim();
      // business_id maps to a uuid column; reject a malformed one with 400 rather than a DB 500.
      if (!isUuid(trimmed)) {
        return c.json({ error: "invalid_business_id", detail: "x-business-id must be a UUID" }, 400);
      }
      businessId = trimmed;
    }
    c.set("tenantId", tenantId);
    c.set("businessId", businessId);
    await next();
    return;
  };
}
