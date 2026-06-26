import type { MiddlewareHandler } from "hono";
import type { AppDeps, AppEnv } from "../types.js";

/**
 * Authentication gate. Reads `Authorization: Bearer <jwt>`; a missing/blank token is 401. The token
 * is verified via the injected `deps.verifyToken` (Supabase JWKS in production); any throw is 401.
 * On success the verified `sub` is stashed as `userId`. No secrets or tokens are ever logged.
 */
export function authMiddleware(deps: AppDeps): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const header = c.req.header("Authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    const token = match?.[1]?.trim();
    if (!token) {
      return c.json({ error: "unauthorized" }, 401);
    }
    try {
      const payload = await deps.verifyToken(token);
      if (!payload.sub) {
        return c.json({ error: "unauthorized" }, 401);
      }
      c.set("userId", payload.sub);
    } catch {
      // Never surface verifier internals or the token itself.
      return c.json({ error: "unauthorized" }, 401);
    }
    await next();
    return;
  };
}
