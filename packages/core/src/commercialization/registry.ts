import {
  ClassifyFeatureInputSchema,
  FeatureClassificationSchema,
  type ClassifyFeatureInput,
  type FeatureClassification,
  type CommercializationTier,
} from "@alfy2/shared";

/**
 * The FounderOS Commercialization Layer (docs/adr/ADR-0049-founderos-commercialization.md). Alfy² is
 * Tenant 001, designed so it can later become FounderOS. Every internal feature is classified by its
 * commercialization tier and flagged as a possible SaaS module. This is PREPARATION ONLY — nothing is
 * commercialized yet (`commercialized` is always false). Deterministic. Tenant-scoped.
 */

/** Seed classifications for the named features (architecture-prep defaults). */
const SEED: ClassifyFeatureInput[] = [
  { feature_name: "Executive Inbox", tier: "founder_saas_feature", saas_module_candidate: true, rationale: "Single entry point — every founder needs it.", readiness: 0.7 },
  { feature_name: "Revenue Factory", tier: "founder_saas_feature", saas_module_candidate: true, rationale: "Per-business money cockpit — high willingness to pay.", readiness: 0.6 },
  { feature_name: "Conversion War Room", tier: "founder_saas_feature", saas_module_candidate: true, rationale: "Revenue-first A/B optimization across surfaces.", readiness: 0.6 },
  { feature_name: "Agent Factory", tier: "enterprise_product", saas_module_candidate: true, rationale: "Self-extending agents — an enterprise-grade capability.", readiness: 0.5 },
  { feature_name: "Follow-Up Autopilot", tier: "founder_saas_feature", saas_module_candidate: true, rationale: "Never-drop-the-ball follow-up — broad demand.", readiness: 0.65 },
  { feature_name: "Asset Library", tier: "business_reusable", saas_module_candidate: true, rationale: "Cross-business asset catalog — reusable infra.", readiness: 0.7 },
  { feature_name: "Goal Engine", tier: "founder_saas_feature", saas_module_candidate: true, rationale: "Goal → continuously-pursued plan.", readiness: 0.6 },
  { feature_name: "Pattern Engine", tier: "business_reusable", saas_module_candidate: true, rationale: "Behavioral insight — advisory layer.", readiness: 0.5 },
  { feature_name: "Control Tower", tier: "enterprise_product", saas_module_candidate: true, rationale: "Operator dashboard — enterprise visibility.", readiness: 0.55 },
  { feature_name: "Knowledge-to-Money Engine", tier: "founder_saas_feature", saas_module_candidate: true, rationale: "Knowledge → asset → cash chain — the flagship.", readiness: 0.6 },
];

export class CommercializationRegistry {
  private readonly features = new Map<string, FeatureClassification>();
  private readonly byName = new Map<string, string>();
  private readonly seeded = new Set<string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Classify (or re-classify) a feature. */
  classify(tenantId: string, input: ClassifyFeatureInput): FeatureClassification {
    const i = ClassifyFeatureInputSchema.parse(input);
    const now = this.clock().toISOString();
    const key = `${tenantId}|${i.feature_name}`;
    const existingId = this.byName.get(key);
    const base = {
      tenant_id: tenantId,
      feature_name: i.feature_name,
      tier: i.tier,
      saas_module_candidate: i.saas_module_candidate,
      rationale: i.rationale,
      readiness: i.readiness,
      commercialized: false, // preparation only — never activated here
      updated_at: now,
    };
    if (existingId) {
      const updated = FeatureClassificationSchema.parse({ ...this.features.get(existingId)!, ...base });
      this.features.set(existingId, updated);
      return updated;
    }
    const fc = FeatureClassificationSchema.parse({ id: this.newId(), created_at: now, ...base });
    this.features.set(fc.id, fc);
    this.byName.set(key, fc.id);
    return fc;
  }

  list(tenantId: string): FeatureClassification[] {
    this.ensureSeeded(tenantId);
    return [...this.features.values()].filter((f) => f.tenant_id === tenantId);
  }

  byTier(tenantId: string, tier: CommercializationTier): FeatureClassification[] {
    return this.list(tenantId).filter((f) => f.tier === tier);
  }

  /** Features that could become SaaS modules. */
  saasModules(tenantId: string): FeatureClassification[] {
    return this.list(tenantId).filter((f) => f.saas_module_candidate);
  }

  get(tenantId: string, featureName: string): FeatureClassification | undefined {
    this.ensureSeeded(tenantId);
    const id = this.byName.get(`${tenantId}|${featureName}`);
    return id ? this.features.get(id) : undefined;
  }

  private ensureSeeded(tenantId: string): void {
    if (this.seeded.has(tenantId)) return;
    this.seeded.add(tenantId);
    for (const s of SEED) this.classify(tenantId, s);
  }
}
