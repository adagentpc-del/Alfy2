import {
  MissionControlAlertSchema,
  MissionControlSnapshotSchema,
  type MissionControlAlert,
  type MissionControlPriority,
  type MissionControlSnapshot,
} from "@alfy2/shared";
import type {
  MissionControlAggregate,
  MissionControlPendingApproval,
  MissionControlReadModel,
} from "./read-model.js";

/**
 * Executive Mission Control engine — Layer 0 CEO read-model (§28). Reads the world through a
 * {@link MissionControlReadModel} port, then deterministically:
 *  - evaluates the §28.4 alert rules (cash runway, high-risk + stale approvals, department health, launch),
 *  - derives the top-3 priorities (§28.1) from the aggregate,
 *  - assembles a {@link MissionControlSnapshot} (parsed on output), and
 *  - renders the §28.6 daily CEO brief / §28.7 weekly executive summary as plain deterministic strings.
 *
 * No business logic of its own and no I/O beyond the injected read-model. The clock + id factory are
 * injectable so composition is fully reproducible.
 */

/** Action classes whose blast radius is severe enough to surface immediately as critical risk (§28.4). */
const HIGH_RISK_ACTION_CLASSES: ReadonlySet<string> = new Set([
  "move_money",
  "charge",
  "change_pricing",
  "delete_data",
  "deploy",
  "send_contract",
  "publish_public",
]);

/** Approval open longer than this escalates to the CEO digest (§28.4). */
const STALE_APPROVAL_MS = 24 * 60 * 60 * 1000;

/** Runway thresholds in days (§28.4). */
const RUNWAY_CRITICAL_DAYS = 30;
const RUNWAY_WARN_DAYS = 60;

export interface MissionControlEngineOptions {
  /** Injectable clock (defaults to wall-clock). Drives created_at + the stale-approval rule. */
  clock?: () => Date;
  /** Injectable id factory (defaults to crypto.randomUUID). */
  idFactory?: () => string;
  /** Injectable epoch-millis source (defaults to clock().getTime()). */
  nowMs?: () => number;
}

export class MissionControlEngine {
  private readonly clock: () => Date;
  private readonly idFactory: () => string;
  private readonly nowMs: () => number;

  constructor(
    private readonly readModel: MissionControlReadModel,
    options: MissionControlEngineOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
    this.nowMs = options.nowMs ?? (() => this.clock().getTime());
  }

  /**
   * Compose the one-screen snapshot + the full alert set for a tenant (optionally one business).
   * Deterministic: same aggregate + clock → same output.
   */
  async compose(
    tenantId: string,
    businessId?: string,
  ): Promise<{ snapshot: MissionControlSnapshot; alerts: MissionControlAlert[] }> {
    const agg =
      businessId !== undefined
        ? await this.readModel.aggregate(tenantId, businessId)
        : await this.readModel.aggregate(tenantId);

    const businessIdOrNull = businessId ?? null;
    const alerts = this.evaluateAlerts(tenantId, businessIdOrNull, agg);

    const critical_alerts = alerts.filter((a) => a.severity === "critical");
    const risk_alerts = alerts.filter((a) => a.category === "risk" || a.category === "agent");

    const top_priorities = this.deriveTopPriorities(agg, alerts);

    const snapshot = MissionControlSnapshotSchema.parse({
      id: this.idFactory(),
      tenant_id: tenantId,
      business_id: businessIdOrNull,
      as_of: agg.as_of,
      revenue_today: agg.revenue_today,
      cash_position: agg.cash_position,
      cash_runway_days: agg.cash_runway_days,
      kpi_status: {},
      approval_queue: agg.pending_approvals.map((p) => ({
        id: p.id,
        action_class: p.action_class,
        risk: p.risk,
        summary: p.summary,
        requires_approval: p.requires_approval,
        created_at: p.created_at,
      })),
      critical_alerts,
      blocked_tasks: agg.blocked.map((b) => ({ id: b.id, label: b.label })),
      active_builds: agg.active_builds.map((b) => ({ label: b.label, pct: b.pct })),
      agent_activity: {},
      department_health: agg.department_health,
      business_health: {},
      follow_ups_due: agg.follow_ups_due.map((f) => ({ id: f.id, label: f.label, due: f.due })),
      meetings: agg.meetings.map((m) => ({ id: m.id, label: m.label, at: m.at })),
      risk_alerts,
      founder_capacity: { score: agg.founder_capacity.score, mode: agg.founder_capacity.mode },
      top_priorities,
      revenue_opportunities: agg.opportunities.map((o) => ({
        label: o.label,
        value: o.value,
        status: o.status,
      })),
      launch_readiness: agg.launch_readiness,
      open_loops: agg.blocked.map((b) => ({ id: b.id, label: b.label })),
      created_at: this.clock().toISOString(),
    });

    return { snapshot, alerts };
  }

  /** Deterministically evaluate the §28.4 alert rules over the aggregate. */
  private evaluateAlerts(
    tenantId: string,
    businessId: string | null,
    agg: MissionControlAggregate,
  ): MissionControlAlert[] {
    const out: MissionControlAlert[] = [];
    const createdAt = this.clock().toISOString();
    const now = this.nowMs();

    const push = (a: {
      severity: "info" | "warn" | "critical";
      category: "revenue" | "cash" | "risk" | "agent" | "approval" | "health" | "launch";
      title: string;
      detail?: string;
      source_ref?: string;
      requires_approval?: boolean;
      routed_to?: string;
    }): void => {
      out.push(
        MissionControlAlertSchema.parse({
          id: this.idFactory(),
          tenant_id: tenantId,
          business_id: businessId,
          severity: a.severity,
          category: a.category,
          title: a.title,
          ...(a.detail !== undefined ? { detail: a.detail } : {}),
          ...(a.source_ref !== undefined ? { source_ref: a.source_ref } : {}),
          ...(a.requires_approval !== undefined ? { requires_approval: a.requires_approval } : {}),
          ...(a.routed_to !== undefined ? { routed_to: a.routed_to } : {}),
          status: "open",
          created_at: createdAt,
        }),
      );
    };

    // --- Cash / runway (§28.4) ---
    if (agg.cash_runway_days !== null) {
      if (agg.cash_runway_days < RUNWAY_CRITICAL_DAYS) {
        push({
          severity: "critical",
          category: "cash",
          title: `Cash runway is ${agg.cash_runway_days} days`,
          detail: "Runway under 30 days — protect cash now.",
          source_ref: "capital_runway",
          routed_to: "ceo",
        });
      } else if (agg.cash_runway_days < RUNWAY_WARN_DAYS) {
        push({
          severity: "warn",
          category: "cash",
          title: `Cash runway is ${agg.cash_runway_days} days`,
          detail: "Runway under 60 days — watch burn.",
          source_ref: "capital_runway",
        });
      }
    }

    // --- Approvals: high-risk surfaces immediately; stale (>24h) escalates (§28.4) ---
    for (const p of agg.pending_approvals) {
      if (HIGH_RISK_ACTION_CLASSES.has(p.action_class)) {
        push({
          severity: "critical",
          category: "risk",
          title: "High-risk action awaiting approval",
          detail: `${p.action_class}: ${p.summary}`,
          source_ref: p.id,
          requires_approval: true,
          routed_to: "ceo",
        });
      }
      const age = now - Date.parse(p.created_at);
      if (Number.isFinite(age) && age > STALE_APPROVAL_MS) {
        push({
          severity: "warn",
          category: "approval",
          title: "Approval open over 24 hours",
          detail: `Escalate to CEO digest: ${p.summary}`,
          source_ref: p.id,
          requires_approval: true,
          routed_to: "ceo",
        });
      }
    }

    // --- Department health: any "red" department warns (§28.4 agent/health) ---
    for (const [dept, status] of Object.entries(agg.department_health)) {
      if (status === "red") {
        push({
          severity: "warn",
          category: "health",
          title: `Department health red: ${dept}`,
          detail: `${dept} is reporting red — review department.`,
          source_ref: dept,
        });
      }
    }

    // --- Launch readiness: any scope below 100% is an info launch alert (§28.4) ---
    for (const [scope, readiness] of Object.entries(agg.launch_readiness)) {
      if (readiness < 1.0) {
        push({
          severity: "info",
          category: "launch",
          title: `Launch readiness ${Math.round(readiness * 100)}%: ${scope}`,
          detail: `${scope} is not launch-ready.`,
          source_ref: scope,
        });
      }
    }

    return out;
  }

  /** Deterministically rank up to three priorities from the aggregate + evaluated alerts (§28.1). */
  private deriveTopPriorities(
    agg: MissionControlAggregate,
    alerts: MissionControlAlert[],
  ): MissionControlPriority[] {
    const out: MissionControlPriority[] = [];

    // 1. Highest-risk pending approval, if any (the critical risk alert is rank 1).
    const highRisk: MissionControlPendingApproval | undefined = agg.pending_approvals.find((p) =>
      HIGH_RISK_ACTION_CLASSES.has(p.action_class),
    );
    if (highRisk !== undefined) {
      out.push({
        rank: out.length + 1,
        title: `Approve: ${highRisk.summary}`,
        why: `High-risk ${highRisk.action_class} is awaiting your approval.`,
        category: "approval",
      });
    } else if (alerts.some((a) => a.severity === "critical" && a.category === "cash")) {
      out.push({
        rank: out.length + 1,
        title: "Protect cash — runway is critical",
        why: "Cash runway is under 30 days.",
        category: "cash",
      });
    }

    // 2. Oldest blocked item, else a due follow-up.
    if (out.length < 3 && agg.blocked.length > 0) {
      const first = agg.blocked[0]!;
      out.push({
        rank: out.length + 1,
        title: `Unblock: ${first.label}`,
        why: "A blocked item is stalling execution.",
        category: "risk",
      });
    } else if (out.length < 3 && agg.follow_ups_due.length > 0) {
      const first = agg.follow_ups_due[0]!;
      out.push({
        rank: out.length + 1,
        title: `Follow up: ${first.label}`,
        why: `Due ${first.due}.`,
        category: "revenue",
      });
    }

    // 3. Revenue: the top opportunity, if any.
    if (out.length < 3 && agg.opportunities.length > 0) {
      const top = [...agg.opportunities].sort((a, b) => b.value - a.value)[0]!;
      out.push({
        rank: out.length + 1,
        title: `Review revenue brief: ${top.label}`,
        why: `Open opportunity worth ${top.value}.`,
        category: "revenue",
      });
    }

    return out.slice(0, 3);
  }

  /** Render the §28.6 daily CEO brief as a deterministic plain string. */
  buildDailyBrief(snapshot: MissionControlSnapshot): string {
    const date = snapshot.as_of.slice(0, 10);
    const runway = snapshot.cash_runway_days === null ? "n/a" : `${snapshot.cash_runway_days} days`;
    const highRisk = snapshot.critical_alerts.filter((a) => a.requires_approval).length;
    const priorities =
      snapshot.top_priorities.length > 0
        ? snapshot.top_priorities.map((p) => `${p.rank}) ${p.title}`).join(" ")
        : "1) (none)";
    const hot =
      snapshot.revenue_opportunities.length > 0
        ? snapshot.revenue_opportunities
            .map((o) => String((o as { label?: unknown }).label ?? ""))
            .filter((s) => s.length > 0)
            .join(", ")
        : "(none)";
    const mode = String((snapshot.founder_capacity as { mode?: unknown }).mode ?? "normal");

    return [
      `ALFIE2 DAILY BRIEF — ${date}`,
      `Money: revenue today $${snapshot.revenue_today} · cash $${snapshot.cash_position} · runway ${runway}`,
      `Top 3 priorities: ${priorities}`,
      `Needs you today: ${snapshot.approval_queue.length} approvals (${highRisk} high-risk)`,
      `Watch: ${snapshot.risk_alerts.length} risk alert(s) · Blocked: ${snapshot.blocked_tasks.length}`,
      `Revenue opportunities (hot): ${hot}`,
      `Founder mode: ${mode}`,
    ].join("\n");
  }

  /** Render the §28.7 weekly executive summary as a deterministic plain string. */
  buildWeeklySummary(snapshot: MissionControlSnapshot): string {
    const week = snapshot.as_of.slice(0, 10);
    const depts = Object.entries(snapshot.department_health as Record<string, unknown>)
      .map(([d, s]) => `${d}: ${String(s)}`)
      .join(", ");
    const runway = snapshot.cash_runway_days === null ? "n/a" : `${snapshot.cash_runway_days} days`;
    const decisions =
      snapshot.top_priorities.length > 0
        ? snapshot.top_priorities.map((p) => `- ${p.title} (${p.why})`).join("\n")
        : "- (none)";

    return [
      `WEEKLY EXECUTIVE REVIEW — week of ${week}`,
      `Portfolio: cash $${snapshot.cash_position} · runway ${runway} · revenue today $${snapshot.revenue_today}`,
      `Department health: ${depts || "(none)"}`,
      `Decisions needed:`,
      decisions,
      `Next-week top 3 + revenue focus: ${snapshot.revenue_opportunities.length} opportunity(ies) open`,
    ].join("\n");
  }
}
