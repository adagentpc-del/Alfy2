import type {
  ExecutiveInbox,
  ApprovalGateService,
  MissionControlEngine,
  MissionControlAlertService,
  FounderCapacityEngine,
  RevOpsEngine,
  AdvisoryDecisionEngine,
  CapitalAllocationEngine,
  DelegationRuntime,
  MeteredAi,
} from "@alfy2/core";

/**
 * The per-request, tenant-scoped repositories handed to a route handler. All are already bound to
 * the active tenant's persistence (in-memory in tests, Pg-over-RLS in production) by {@link AppDeps.scope}.
 */
export interface RequestRepos {
  inbox: ExecutiveInbox;
  gate: ApprovalGateService;
  missionControl: MissionControlEngine;
  missionControlAlerts: MissionControlAlertService;
  founderCapacity: FounderCapacityEngine;
  revops: RevOpsEngine;
  decisions: AdvisoryDecisionEngine;
  capital: CapitalAllocationEngine;
  delegation: DelegationRuntime;
}

/**
 * Everything the HTTP gateway needs, injected so the app is environment-free (no top-level
 * `loadConfig`, no `pg`). Production wires real persistence + JWKS in `main.ts`; tests inject
 * in-memory repos and a local keypair verifier.
 */
export interface AppDeps {
  /** Live AI layer — undefined until AI_PROVIDER_API_KEY is set (routes answer 503 ai_not_configured). */
  ai?: MeteredAi;
  config: {
    /** Single-operator default tenant (every request runs inside it). */
    defaultTenantId: string;
  };
  /**
   * Verify a bearer JWT and return its claims (must include `sub`). Throws on any invalid token.
   * Production wires Supabase JWKS; tests inject a local verifier.
   */
  verifyToken: (token: string) => Promise<{ sub: string } & Record<string, unknown>>;
  /**
   * Run `fn` with tenant-scoped repositories. Production opens a `Db.withTenant` transaction and
   * builds Pg-backed repos; tests close over shared in-memory repos so state persists across calls.
   */
  scope: <T>(
    tenantId: string,
    businessId: string | undefined,
    fn: (ctx: RequestRepos) => Promise<T>,
  ) => Promise<T>;
  clock?: () => Date;
  idFactory?: () => string;
  /** Browser origins allowed via CORS. Production wires these from config; tests may omit. */
  corsOrigins?: string[];
}

/** Hono context variables set by the middleware chain. */
export interface AppVariables {
  userId: string;
  tenantId: string;
  businessId: string | undefined;
}

/** Hono environment binding for this app (shared `Variables` + injected `AppDeps`). */
export interface AppEnv {
  Variables: AppVariables & { deps: AppDeps };
}
