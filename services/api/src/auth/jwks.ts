import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AppDeps } from "../types.js";

/**
 * Production token verifier backed by Supabase's JWKS endpoint. Validates signature + issuer and
 * returns the claims (which include `sub`). Used only by `main.ts`; tests inject a local verifier
 * instead, so this module is never imported by the smoke test.
 */
export function makeJwksVerifier(supabaseUrl: string): AppDeps["verifyToken"] {
  const issuer = `${supabaseUrl}/auth/v1`;
  const jwks = createRemoteJWKSet(
    new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
  );

  return async (token: string) => {
    const { payload } = await jwtVerify(token, jwks, { issuer });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new Error("token missing sub");
    }
    return payload as { sub: string } & Record<string, unknown>;
  };
}
