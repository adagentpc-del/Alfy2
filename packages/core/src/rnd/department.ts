import {
  EvaluateDiscoveryInputSchema,
  RndDiscoverySchema,
  InnovationReportSchema,
  type EvaluateDiscoveryInput,
  type RndDiscovery,
  type InnovationReport,
  type RndDomain,
  type RndDisposition,
} from "@alfy2/shared";

/**
 * The Research & Development Department (docs/adr/ADR-0111-rnd.md). Continuously evaluates discoveries
 * across technology and industry so Alyssa stays ahead. For every discovery it computes a confidence from
 * relevance, upside, maturity, effort, and risk, then assigns a disposition — learn / test / implement /
 * ignore / watch / invest / build_on / partner — and flags only the high-confidence ones for surfacing.
 * Produces a weekly Innovation Report grouping the strongest opportunities and a watch list. Deterministic.
 * Tenant-scoped.
 */

const HIGH_CONFIDENCE_THRESHOLD = 0.7;

export class ResearchAndDevelopmentDepartment {
  private readonly discoveries = new Map<string, RndDiscovery>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Score a discovery, assign a disposition, and record it. */
  evaluate(tenantId: string, input: EvaluateDiscoveryInput): RndDiscovery {
    const i = EvaluateDiscoveryInputSchema.parse(input);

    const confidence = clamp(
      i.relevance * 0.4 + i.upside * 0.3 + i.maturity * 0.2 - i.risk * 0.2 - i.effort * 0.1,
      0,
      1,
    );
    const disposition = this.disposition(i);
    const high_confidence = confidence >= HIGH_CONFIDENCE_THRESHOLD;

    const discovery = RndDiscoverySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      domain: i.domain,
      title: i.title,
      disposition,
      confidence: round(confidence),
      high_confidence,
      rationale: this.rationale(i, confidence, disposition),
      next_step: this.nextStep(i, disposition),
      created_at: this.clock().toISOString(),
    });
    this.discoveries.set(discovery.id, discovery);
    return discovery;
  }

  /** The weekly Innovation Report — high-confidence opportunities plus the watch list. */
  report(tenantId: string, period_label: string): InnovationReport {
    const all = this.list(tenantId);
    const highConfidence = all.filter((d) => d.high_confidence);
    const top_opportunities = [...highConfidence].sort((a, b) => b.confidence - a.confidence).slice(0, 10);
    const watch_list = all.filter((d) => d.disposition === "watch").map((d) => d.title);

    return InnovationReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      period_label,
      evaluated_count: all.length,
      high_confidence_count: highConfidence.length,
      top_opportunities,
      watch_list,
      created_at: this.clock().toISOString(),
    });
  }

  get(tenantId: string, id: string): RndDiscovery | undefined {
    const d = this.discoveries.get(id);
    return d && d.tenant_id === tenantId ? d : undefined;
  }

  list(tenantId: string): RndDiscovery[] {
    return [...this.discoveries.values()].filter((d) => d.tenant_id === tenantId);
  }

  // --- internals ---

  /** Disposition rules, evaluated in priority order. */
  private disposition(i: EvaluateDiscoveryInput): RndDisposition {
    if (i.relevance < 0.3) return "ignore";
    if (i.maturity < 0.4 && i.upside >= 0.5) return "watch";
    if (i.upside >= 0.7 && (i.domain === "startup" || i.domain === "competitor") && i.maturity >= 0.5) return "invest";
    if (i.maturity >= 0.7 && i.upside >= 0.6 && i.effort < 0.6) return "implement";
    if ((i.domain === "github_repo" || i.domain === "api" || i.domain === "ai_model") && i.maturity >= 0.6) return "build_on";
    if ((i.domain === "competitor" || i.domain === "startup") && i.upside >= 0.6 && i.effort >= 0.6) return "partner";
    if (i.maturity >= 0.4 && i.maturity <= 0.7) return "test";
    return "learn";
  }

  private rationale(i: EvaluateDiscoveryInput, confidence: number, disposition: RndDisposition): string {
    const base =
      `${DOMAIN_LABEL[i.domain]} "${i.title}" scored confidence ${round(confidence)} ` +
      `(relevance ${i.relevance}, upside ${i.upside}, maturity ${i.maturity}, effort ${i.effort}, risk ${i.risk}).`;
    return `${base} ${DISPOSITION_RATIONALE[disposition]}`;
  }

  private nextStep(i: EvaluateDiscoveryInput, disposition: RndDisposition): string {
    return DISPOSITION_NEXT_STEP[disposition].replace("{title}", i.title);
  }
}

const DOMAIN_LABEL: Record<RndDomain, string> = {
  ai_model: "AI model",
  github_repo: "GitHub repo",
  research_paper: "Research paper",
  patent: "Patent",
  startup: "Startup",
  competitor: "Competitor",
  api: "API",
  hardware: "Hardware",
  quantum: "Quantum",
  security: "Security",
  robotics: "Robotics",
  healthcare: "Healthcare",
  construction: "Construction",
  real_estate: "Real estate",
  finance: "Finance",
  regulation: "Regulation",
  emerging_industry: "Emerging industry",
  workflow: "Workflow",
  automation: "Automation",
};

const DISPOSITION_RATIONALE: Record<RndDisposition, string> = {
  ignore: "Relevance is too low to spend attention on — ignore it.",
  watch: "Promising upside but immature — watch it until it ripens.",
  invest: "High upside in a startup/competitor that has matured — invest.",
  implement: "Mature, high-upside, and low-effort — implement it now.",
  build_on: "A mature buildable primitive — build on top of it.",
  partner: "High upside but heavy to do alone — partner to capture it.",
  test: "Mid-maturity — run a small test before committing.",
  learn: "Worth understanding but not yet actionable — learn from it.",
};

const DISPOSITION_NEXT_STEP: Record<RndDisposition, string> = {
  ignore: "Archive \"{title}\" and revisit only if signals change.",
  watch: "Add \"{title}\" to the watch list and re-evaluate next cycle.",
  invest: "Open an investment thesis on \"{title}\" and size a position.",
  implement: "Scope an implementation plan for \"{title}\" this sprint.",
  build_on: "Prototype an integration that builds on \"{title}\".",
  partner: "Draft a partnership outreach for \"{title}\".",
  test: "Run a small, time-boxed test of \"{title}\".",
  learn: "Capture a learning note on \"{title}\" for the knowledge vault.",
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
