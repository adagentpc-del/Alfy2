import {
  AnalyzeFailureInputSchema,
  AntiFragilityCaseSchema,
  type AnalyzeFailureInput,
  type AntiFragilityCase,
  type FailureType,
} from "@alfy2/shared";

/**
 * Anti-Fragility Engine (docs/adr/ADR-0095-anti-fragility.md). Don't merely withstand failures — improve
 * because of them. For every failure it derives a templated root cause, a reusable lesson, and the new
 * safeguard / automation / agent / SOP / system redesign the failure implies, then scores recovery speed,
 * learning gained (higher when the failure was preventable and detail-rich), and future risk reduction
 * (higher when a safeguard, automation, and SOP are all produced). Append-only-ish. Tenant-scoped.
 */

interface FailureTemplate {
  root_cause: string;
  reusable_lesson: string;
  new_safeguard: string;
  new_automation: string;
  new_agent: string;
  new_sop: string;
  system_redesign: string;
}

const TEMPLATES: Record<FailureType, FailureTemplate> = {
  missed_opportunity: {
    root_cause: "The opportunity was not detected or surfaced in time to act.",
    reusable_lesson: "Surface high-value opportunities the moment signals appear, not after they pass.",
    new_safeguard: "Opportunity-decay alert when a tracked signal ages past threshold.",
    new_automation: "Auto-scan inbound signals and queue opportunities for review.",
    new_agent: "Opportunity-scout agent that monitors signal sources continuously.",
    new_sop: "SOP: triage every surfaced opportunity within 24 hours.",
    system_redesign: "Add an always-on opportunity radar feeding the daily executive brief.",
  },
  failed_launch: {
    root_cause: "Launch readiness was assumed rather than verified against a gating checklist.",
    reusable_lesson: "Gate every launch on a verified readiness checklist before go-live.",
    new_safeguard: "Pre-launch readiness gate blocking release until all checks pass.",
    new_automation: "Automated launch-readiness checklist run in the release pipeline.",
    new_agent: "Launch-readiness reviewer agent that audits the checklist.",
    new_sop: "SOP: no launch proceeds without a signed-off readiness review.",
    system_redesign: "Stage launches behind a readiness gate with rollback built in.",
  },
  security_incident: {
    root_cause: "A control gap allowed access or exposure that a review should have caught.",
    reusable_lesson: "Default to least-privilege and gate every change on a security review.",
    new_safeguard: "Least-privilege default plus a mandatory access-control review on every deploy.",
    new_automation: "Automated config scan that flags open or over-permissive resources.",
    new_agent: "Security-review agent that audits access controls pre-deploy.",
    new_sop: "SOP: every deploy passes an access-control review before release.",
    system_redesign: "Embed a security gate into the deployment pipeline.",
  },
  rejected_proposal: {
    root_cause: "The proposal did not address a decisive objection before it was presented.",
    reusable_lesson: "Pre-empt the strongest objection in every proposal before it goes out.",
    new_safeguard: "Objection-coverage check before any proposal is sent.",
    new_automation: "Auto-assemble objection-handling sections from prior wins.",
    new_agent: "Proposal-critique agent that argues the opposing side first.",
    new_sop: "SOP: every proposal is red-teamed before submission.",
    system_redesign: "Route proposals through a pre-submission review board.",
  },
  lost_sale: {
    root_cause: "A buying signal or competitive risk went unaddressed during the deal.",
    reusable_lesson: "Track buying signals and competitive risk on every active deal.",
    new_safeguard: "Deal-risk alert when engagement drops or a competitor appears.",
    new_automation: "Automated deal-health scoring across the pipeline.",
    new_agent: "Deal-coach agent that flags at-risk deals and next best actions.",
    new_sop: "SOP: review every at-risk deal weekly with a recovery plan.",
    system_redesign: "Add deal-health monitoring to the revenue dashboard.",
  },
  customer_complaint: {
    root_cause: "A recurring friction point reached the customer before it was caught internally.",
    reusable_lesson: "Detect and resolve friction patterns before they reach the customer.",
    new_safeguard: "Complaint-pattern alert when similar issues cluster.",
    new_automation: "Auto-cluster complaints and route to the owning team.",
    new_agent: "Customer-sentiment agent that watches for emerging issues.",
    new_sop: "SOP: every complaint is root-caused, not just resolved.",
    system_redesign: "Feed complaint patterns into the product backlog automatically.",
  },
  agent_failure: {
    root_cause: "An agent acted outside its competence without a guardrail catching it.",
    reusable_lesson: "Bound every agent with explicit guardrails and a fallback path.",
    new_safeguard: "Output-validation guardrail that halts low-confidence agent actions.",
    new_automation: "Automated regression evals on every agent change.",
    new_agent: "Agent-supervisor that monitors and can halt misbehaving agents.",
    new_sop: "SOP: every agent ships with evals and a defined fallback.",
    system_redesign: "Wrap agents in a supervision layer with confidence gating.",
  },
  workflow_breakdown: {
    root_cause: "A workflow step failed silently without a retry or alert.",
    reusable_lesson: "Make every workflow step observable, retryable, and alertable.",
    new_safeguard: "Step-level failure alert with automatic escalation.",
    new_automation: "Automated retries with backoff on transient workflow failures.",
    new_agent: "Workflow-monitor agent that detects and reroutes around breakages.",
    new_sop: "SOP: every workflow step defines failure handling up front.",
    system_redesign: "Add observability and retry semantics to the workflow engine.",
  },
  model_error: {
    root_cause: "A model output was trusted without validation against ground truth.",
    reusable_lesson: "Validate model outputs against checks before they drive actions.",
    new_safeguard: "Output-validation gate that rejects unverifiable model claims.",
    new_automation: "Automated grounding checks on model outputs.",
    new_agent: "Verification agent that cross-checks model outputs against sources.",
    new_sop: "SOP: high-stakes model outputs require a verification pass.",
    system_redesign: "Insert a verification layer between model output and execution.",
  },
};

export class AntiFragilityEngine {
  private readonly cases = new Map<string, AntiFragilityCase>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Turn a failure into an anti-fragile response: root cause, lesson, safeguards, and scores. */
  analyze(tenantId: string, input: AnalyzeFailureInput): AntiFragilityCase {
    const i = AnalyzeFailureInputSchema.parse(input);
    const t = TEMPLATES[i.type];

    // Learning is higher for preventable, detail-rich failures (~0.7-0.9 when preventable).
    const detailBoost = i.detail.trim().length >= 40 ? 0.1 : 0;
    const learningGained = i.preventable
      ? round(0.8 + detailBoost - 0.0) // 0.8 base, +0.1 with detail → clamp to 0.9
      : round(0.45 + detailBoost);
    const learning = clamp(learningGained, 0, i.preventable ? 0.9 : 0.6);

    // Future risk reduction is high when a safeguard + automation + SOP are all produced (they always are
    // here), modulated by preventability and recovery speed (faster recovery → more confidence).
    const recoveryFactor = i.recovery_days <= 1 ? 0.1 : i.recovery_days <= 7 ? 0.05 : 0;
    const baseReduction = i.preventable ? 0.7 : 0.5;
    const futureRiskReduction = clamp(round(baseReduction + recoveryFactor + detailBoost), 0, 0.95);

    const c = AntiFragilityCaseSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      type: i.type,
      title: i.title,
      root_cause: t.root_cause,
      preventable: i.preventable,
      reusable_lesson: t.reusable_lesson,
      new_safeguard: t.new_safeguard,
      new_automation: t.new_automation,
      new_agent: t.new_agent,
      new_sop: t.new_sop,
      system_redesign: t.system_redesign,
      recovery_days: i.recovery_days,
      learning_gained: learning,
      future_risk_reduction: futureRiskReduction,
      created_at: this.clock().toISOString(),
    });
    this.cases.set(c.id, c);
    return c;
  }

  get(tenantId: string, id: string): AntiFragilityCase | undefined {
    const c = this.cases.get(id);
    return c && c.tenant_id === tenantId ? c : undefined;
  }

  list(tenantId: string): AntiFragilityCase[] {
    return [...this.cases.values()].filter((c) => c.tenant_id === tenantId);
  }

  byType(tenantId: string, type: FailureType): AntiFragilityCase[] {
    return this.list(tenantId).filter((c) => c.type === type);
  }

  /** Mean recovery days across this tenant's cases (0 when none). */
  avgRecoveryDays(tenantId: string): number {
    const cases = this.list(tenantId);
    if (cases.length === 0) return 0;
    const total = cases.reduce((sum, c) => sum + c.recovery_days, 0);
    return round(total / cases.length);
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
