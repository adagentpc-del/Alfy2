import {
  GenerateManualInputSchema,
  OperatingManualSchema,
  type GenerateManualInput,
  type OperatingManual,
  type ManualArtifact,
  type ManualArtifactKind,
} from "@alfy2/shared";

/**
 * The Operating Manual Generator (docs/adr/ADR-0055-operating-manual-generator.md). When a workflow
 * becomes stable, it generates the SOP, checklist, playbook, onboarding guide, training document,
 * troubleshooting guide, KPIs, and ownership matrix, and stores each in the Asset Library by reference —
 * treating every successful workflow as reusable IP. Deterministic. Tenant-scoped. Workflow-triggered
 * (distinct from the domain-triggered Enterprise Playbook Generator).
 */

export class OperatingManualError extends Error {}

/** Saves an artifact to the Asset Library and returns its reference id (never the payload). */
export type ManualAssetSink = (tenantId: string, artifact: { kind: string; title: string }) => string;

const ALL_KINDS: ManualArtifactKind[] = [
  "sop", "checklist", "playbook", "onboarding_guide", "training_document", "troubleshooting_guide", "kpis", "ownership_matrix",
];

export class OperatingManualGenerator {
  private readonly manuals = new Map<string, OperatingManual>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly assetSink: ManualAssetSink;

  constructor(options: { clock?: () => Date; idFactory?: () => string; assetSink?: ManualAssetSink } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.assetSink = options.assetSink ?? ((_t, a) => `asset:${slug(a.title)}`);
  }

  /** Generate the full operating manual for a stable workflow. Throws if the workflow isn't stable yet. */
  generate(tenantId: string, input: GenerateManualInput): OperatingManual {
    const i = GenerateManualInputSchema.parse(input);
    if (!i.is_stable) throw new OperatingManualError(`Workflow "${i.workflow_name}" is not stable yet — document it once it stabilizes.`);

    const artifacts: ManualArtifact[] = ALL_KINDS.map((kind) => {
      const title = `${titleFor(kind)} — ${i.workflow_name}`;
      const asset_id = this.assetSink(tenantId, { kind, title });
      return { kind, title, asset_id, outline: outlineFor(kind, i) };
    });

    const now = this.clock().toISOString();
    const manual = OperatingManualSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      workflow_name: i.workflow_name,
      business_id: i.business_id,
      artifacts,
      reusable_ip: true,
      created_at: now,
      updated_at: now,
    });
    this.manuals.set(manual.id, manual);
    return manual;
  }

  get(tenantId: string, id: string): OperatingManual | undefined {
    const m = this.manuals.get(id);
    return m && m.tenant_id === tenantId ? m : undefined;
  }

  list(tenantId: string): OperatingManual[] {
    return [...this.manuals.values()].filter((m) => m.tenant_id === tenantId);
  }
}

const titleFor = (k: ManualArtifactKind): string => ({
  sop: "SOP", checklist: "Checklist", playbook: "Playbook", onboarding_guide: "Onboarding Guide",
  training_document: "Training Document", troubleshooting_guide: "Troubleshooting Guide", kpis: "KPIs", ownership_matrix: "Ownership Matrix",
}[k]);

const outlineFor = (k: ManualArtifactKind, i: GenerateManualInput): string[] => {
  switch (k) {
    case "sop": return ["Purpose", i.purpose || "Run the workflow reliably", "Steps", ...i.steps];
    case "checklist": return i.steps.length ? i.steps.map((s) => `[ ] ${s}`) : ["[ ] Define the steps"];
    case "playbook": return ["When to run", "Roles", ...i.owners, "Plays", ...i.steps.slice(0, 3)];
    case "onboarding_guide": return ["What this workflow does", i.purpose || "", "Who owns it", ...i.owners];
    case "training_document": return ["Concepts", "Walkthrough", ...i.steps.slice(0, 5)];
    case "troubleshooting_guide": return ["Common failure points", ...i.steps.map((s) => `If "${s}" fails → check inputs/owner`)];
    case "kpis": return i.kpis.length ? i.kpis : ["Cycle time", "Success rate", "Cost per run"];
    case "ownership_matrix": return i.owners.length ? i.owners.map((o) => `${o} — accountable`) : ["Owner — accountable"];
    default: return [];
  }
};
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "manual";
