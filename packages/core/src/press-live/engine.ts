import {
  RunPressLiveInputSchema,
  PressLiveEvaluationSchema,
  type RunPressLiveInput,
  type PressLiveEvaluation,
  type PreLaunchCheck,
  type PreLaunchCheckKind,
  type PressLiveOutcome,
} from "@alfy2/shared";

const ALL_CHECKS: PreLaunchCheckKind[] = [
  "branch_clean", "env_vars_present", "no_secrets_committed", "migrations_ready", "rls_enabled",
  "hosting_config_ready", "email_domain_ready", "webhooks_configured", "tests_pass", "health_checks_pass",
  "rollback_exists", "audit_logging_enabled",
];

/**
 * Press Live Mode (docs/adr/ADR-0144-press-live.md). Verifies the pre-launch checks and never fails silently:
 * unsupplied checks default to failed config. Outcome buckets by the worst failure — secrets before tests
 * before config; when everything passes, the run is `live` only with Alyssa's approval, otherwise
 * `ready_to_launch`. Blocking checks are returned with their where-to-get / where-to-paste intact.
 * Deterministic. Tenant-scoped. Append-only in-memory store.
 */
export class PressLiveMode {
  private readonly runs = new Map<string, PressLiveEvaluation>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  run(tenantId: string, input: RunPressLiveInput): PressLiveEvaluation {
    const i = RunPressLiveInputSchema.parse(input);
    const byKind = new Map<PreLaunchCheckKind, PreLaunchCheck>();
    for (const c of i.checks) byKind.set(c.kind, c);

    const checks: PreLaunchCheck[] = ALL_CHECKS.map(
      (kind) =>
        byKind.get(kind) ?? {
          kind,
          passed: false,
          failure_kind: "config" as const,
          missing_item: `${kind} not checked`,
          where_to_get: "",
          where_to_paste: "",
        },
    );

    const blocking = checks.filter((c) => !c.passed);
    const outcome: PressLiveOutcome =
      blocking.some((c) => c.failure_kind === "secret")
        ? "blocked_by_secrets"
        : blocking.some((c) => c.failure_kind === "test")
          ? "blocked_by_test_failure"
          : blocking.length > 0
            ? "blocked_by_config"
            : i.alyssa_approved
              ? "live"
              : "ready_to_launch";

    const evaluation = PressLiveEvaluationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      build_packet_id: i.build_packet_id,
      checks,
      outcome,
      blocking,
      created_at: this.clock().toISOString(),
    });
    this.runs.set(evaluation.id, evaluation);
    return evaluation;
  }

  get(tenantId: string, id: string): PressLiveEvaluation | undefined {
    const r = this.runs.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): PressLiveEvaluation[] {
    return [...this.runs.values()].filter((r) => r.tenant_id === tenantId);
  }
}
