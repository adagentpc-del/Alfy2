import {
  PrepareInfrastructureInputSchema,
  InfrastructurePlanSchema,
  type PrepareInfrastructureInput,
  type InfrastructurePlan,
  type InfraProvider,
  type InfraComponent,
  type EnvVarPlan,
} from "@alfy2/shared";

/** The env keys each provider needs (drives ready vs needs_secret and the env plan). */
const PROVIDER_ENV: Record<InfraProvider, string[]> = {
  github: ["GITHUB_TOKEN"],
  supabase: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  render: ["RENDER_API_KEY"],
  resend: ["RESEND_API_KEY"],
  stripe: ["STRIPE_SECRET_KEY"],
  google_api: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  openai_api: ["OPENAI_API_KEY"],
  anthropic_api: ["ANTHROPIC_API_KEY"],
  dns: [],
  storage: ["STORAGE_BUCKET"],
  webhooks: ["WEBHOOK_SIGNING_SECRET"],
  cron: [],
  workers: [],
  logging: [],
  monitoring: [],
  analytics: [],
};

/**
 * Infrastructure Launch Engine (docs/adr/ADR-0143-infra-launch.md). prepare() builds a per-provider plan for
 * an approved build: a component is ready when all its env keys are present, otherwise needs_secret (DNS /
 * domain work becomes a manual step). It NEVER blocks on a missing secret — it records placeholders and
 * blocking items and keeps preparing. recordPresentKeys() recomputes readiness as Alyssa supplies secrets.
 * Deterministic. Tenant-scoped. Mutable in-memory store.
 */
export class InfrastructureLaunchEngine {
  private readonly plans = new Map<string, InfrastructurePlan>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  prepare(tenantId: string, input: PrepareInfrastructureInput): InfrastructurePlan {
    const i = PrepareInfrastructureInputSchema.parse(input);
    const present = new Set(i.present_env_keys);
    const now = this.clock().toISOString();

    const components: InfraComponent[] = i.providers.map((provider) => {
      const keys = PROVIDER_ENV[provider];
      const missing = keys.filter((k) => !present.has(k));
      const status =
        missing.length === 0 ? (keys.length === 0 && DNS_LIKE.has(provider) ? "needs_manual_step" : "ready") : "needs_secret";
      return {
        provider,
        status,
        setup_instructions: [`Configure ${provider} for this build.`],
        terminal_commands: [],
        env_keys: keys,
      };
    });

    const envRequired: EnvVarPlan[] = i.providers.flatMap((p) =>
      PROVIDER_ENV[p].map((key) => ({
        key,
        source: `${p} dashboard`,
        optional: false,
        breaks_if_missing: `${p} integration will not work without ${key}.`,
      })),
    );

    const ready = components.filter((c) => c.status === "ready").length;
    const preparedPct = components.length ? round(ready / components.length) : 1;
    const blocking = components.filter((c) => c.status !== "ready").map((c) => `${c.provider}: ${c.status}`);

    const plan = InfrastructurePlanSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      build_packet_id: i.build_packet_id,
      components,
      env_required: envRequired,
      manual_steps: components
        .filter((c) => c.status === "needs_manual_step")
        .map((c) => ({ description: `Complete ${c.provider} manual setup.`, where: `${c.provider} console`, copy_paste_value: null, risk_level: "medium" as const })),
      launch_checklist: ["local test", "migrations applied", "auth test", "email test", "deploy", "smoke test"],
      prepared_pct: preparedPct,
      blocking_items: blocking,
      never_blocks_on_secrets: true,
      created_at: now,
      updated_at: now,
    });
    this.plans.set(plan.id, plan);
    return plan;
  }

  /** Recompute readiness after Alyssa supplies more env keys. */
  recordPresentKeys(tenantId: string, id: string, presentKeys: string[]): InfrastructurePlan {
    const plan = this.require(tenantId, id);
    const present = new Set(presentKeys);
    const components = plan.components.map((c) => {
      const missing = c.env_keys.filter((k) => !present.has(k));
      const status = missing.length === 0 && c.status !== "needs_manual_step" ? "ready" : c.status === "needs_manual_step" ? "needs_manual_step" : missing.length === 0 ? "ready" : "needs_secret";
      return { ...c, status };
    });
    const ready = components.filter((c) => c.status === "ready").length;
    const updated = InfrastructurePlanSchema.parse({
      ...plan,
      components,
      prepared_pct: components.length ? round(ready / components.length) : 1,
      blocking_items: components.filter((c) => c.status !== "ready").map((c) => `${c.provider}: ${c.status}`),
      updated_at: this.clock().toISOString(),
    });
    this.plans.set(id, updated);
    return updated;
  }

  get(tenantId: string, id: string): InfrastructurePlan | undefined {
    const p = this.plans.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): InfrastructurePlan[] {
    return [...this.plans.values()].filter((p) => p.tenant_id === tenantId);
  }

  private require(tenantId: string, id: string): InfrastructurePlan {
    const p = this.get(tenantId, id);
    if (!p) throw new Error(`Infrastructure plan ${id} not found for tenant ${tenantId}.`);
    return p;
  }
}

const DNS_LIKE = new Set<InfraProvider>(["dns"]);
const round = (n: number): number => Math.round(n * 1000) / 1000;
