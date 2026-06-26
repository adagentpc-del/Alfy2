import {
  BusinessOperatingProfileSchema,
  ContextStackSchema,
  BusinessContextLayerSchema,
  type BusinessOperatingProfile,
  type BusinessProfileStatus,
  type BusinessTier,
  type ProfileOffer,
  type ContextStack,
  type ContextStackEntry,
  type BusinessContextLayer,
} from "@alfy2/shared";

/**
 * Business Operating Profile + Context Stack engine.
 *
 * Powers BUSINESS-AWARE EXECUTION: "same global skill, different business execution." Each business
 * gets a rich operating profile; every agent assembles a {@link ContextStack} scoped to ONE business
 * and must never mix business contexts. The "never mix" rule is enforced in code via
 * {@link BusinessProfileEngine.enforceNoCrossBusiness} (which THROWS) so cross-business contamination
 * is impossible, not merely discouraged.
 *
 * Deterministic and infrastructure-free (in-memory reference store; real persistence arrives in a
 * later phase). {@link BusinessProfileEngine.seedTier1Profiles} provisions the five Tier-1 businesses
 * from {@link TIER1_PROFILES}.
 */

export interface BusinessProfileEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

/** The canonical 11-layer load order, derived from the contract enum (single source of truth). */
export const CONTEXT_STACK_LAYER_ORDER: readonly BusinessContextLayer[] =
  BusinessContextLayerSchema.options;

export interface UpsertBusinessProfileInput {
  business_key: string;
  tier?: BusinessTier;
  identity?: string;
  mission?: string;
  revenue_model?: string;
  offers?: ProfileOffer[];
  pricing_notes?: string;
  target_audiences?: string[];
  brand_voice?: string;
  approved_language?: string[];
  banned_language?: string[];
  growth_channels?: string[];
  platform_connections?: string[];
  source_of_truth_systems?: string[];
  active_campaigns?: string[];
  current_priorities?: string[];
  compliance_risks?: string[];
  compliance_caution?: string;
  ai_skills_used?: string[];
  kpis?: string[];
  improvement_backlog?: string[];
  status?: BusinessProfileStatus;
}

export interface ListProfilesFilter {
  tier?: BusinessTier;
  status?: BusinessProfileStatus;
}

/** Optional per-layer content overrides for {@link BusinessProfileEngine.buildContextStack}. */
export type ContextLayerContent = Partial<Record<BusinessContextLayer, string[]>>;

export interface BuildContextStackInput {
  business_key: string;
  task: string;
  /** Optional content to inject into specific layers (e.g. project_context, relationship_history). */
  layer_content?: ContextLayerContent;
}

interface Stores {
  profiles: Map<string, BusinessOperatingProfile>;
  contextStacks: Map<string, ContextStack>;
}

export class BusinessProfileEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    profiles: new Map(),
    contextStacks: new Map(),
  };

  constructor(options: BusinessProfileEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Profiles ------------------------------------------------------------

  /**
   * Create or update a business operating profile. Idempotent per (tenant, business_key): an existing
   * profile is updated in place (keeping its id + created_at); otherwise a new one is created.
   */
  upsertProfile(tenantId: string, input: UpsertBusinessProfileInput): BusinessOperatingProfile {
    const now = this.clock().toISOString();
    const existing = this.getProfile(tenantId, input.business_key);
    const profile = BusinessOperatingProfileSchema.parse({
      id: existing?.id ?? this.newId(),
      tenant_id: tenantId,
      business_key: input.business_key,
      tier: input.tier ?? existing?.tier ?? "tier_1",
      identity: input.identity ?? existing?.identity ?? "",
      mission: input.mission ?? existing?.mission ?? "",
      revenue_model: input.revenue_model ?? existing?.revenue_model ?? "",
      offers: input.offers ?? existing?.offers ?? [],
      pricing_notes: input.pricing_notes ?? existing?.pricing_notes ?? "",
      target_audiences: input.target_audiences ?? existing?.target_audiences ?? [],
      brand_voice: input.brand_voice ?? existing?.brand_voice ?? "",
      approved_language: input.approved_language ?? existing?.approved_language ?? [],
      banned_language: input.banned_language ?? existing?.banned_language ?? [],
      growth_channels: input.growth_channels ?? existing?.growth_channels ?? [],
      platform_connections: input.platform_connections ?? existing?.platform_connections ?? [],
      source_of_truth_systems:
        input.source_of_truth_systems ?? existing?.source_of_truth_systems ?? [],
      active_campaigns: input.active_campaigns ?? existing?.active_campaigns ?? [],
      current_priorities: input.current_priorities ?? existing?.current_priorities ?? [],
      compliance_risks: input.compliance_risks ?? existing?.compliance_risks ?? [],
      compliance_caution: input.compliance_caution ?? existing?.compliance_caution ?? "",
      ai_skills_used: input.ai_skills_used ?? existing?.ai_skills_used ?? [],
      kpis: input.kpis ?? existing?.kpis ?? [],
      improvement_backlog: input.improvement_backlog ?? existing?.improvement_backlog ?? [],
      status: input.status ?? existing?.status ?? "active",
      created_at: existing?.created_at ?? now,
      updated_at: existing ? now : null,
    });
    this.s.profiles.set(profile.id, profile);
    return profile;
  }

  getProfile(tenantId: string, businessKey: string): BusinessOperatingProfile | undefined {
    return [...this.s.profiles.values()].find(
      (p) => p.tenant_id === tenantId && p.business_key === businessKey,
    );
  }

  listProfiles(tenantId: string, filter?: ListProfilesFilter): BusinessOperatingProfile[] {
    return [...this.s.profiles.values()].filter(
      (p) =>
        p.tenant_id === tenantId &&
        (filter?.tier === undefined || p.tier === filter.tier) &&
        (filter?.status === undefined || p.status === filter.status),
    );
  }

  // --- Seed catalog --------------------------------------------------------

  /**
   * Seed the five Tier-1 businesses from {@link TIER1_PROFILES}. Idempotent per (tenant,
   * business_key): an existing profile is left in place (re-seeding does not duplicate). Returns the
   * resulting profiles.
   */
  seedTier1Profiles(tenantId: string): BusinessOperatingProfile[] {
    const result: BusinessOperatingProfile[] = [];
    for (const spec of TIER1_PROFILES) {
      const existing = this.getProfile(tenantId, spec.business_key);
      if (existing) {
        result.push(existing);
        continue;
      }
      result.push(this.upsertProfile(tenantId, spec));
    }
    return result;
  }

  // --- Context stack assembly ---------------------------------------------

  /**
   * Assemble a business-scoped context stack for a task. The 11 layers are emitted IN THE CANONICAL
   * ORDER (security_compliance always layer 1, task_instructions always last). brand_voice,
   * banned_language and compliance_caution are pulled from the business profile and surfaced both in
   * the `business_profile` layer content and as top-level guardrail fields. Throws if the business
   * has no profile (you cannot execute business-aware work without one).
   */
  buildContextStack(tenantId: string, input: BuildContextStackInput): ContextStack {
    const profile = this.getProfile(tenantId, input.business_key);
    if (!profile) {
      throw new Error(
        `BusinessProfileEngine.buildContextStack: no business profile for business_key "${input.business_key}" (tenant ${tenantId})`,
      );
    }

    const overrides = input.layer_content ?? {};

    const businessProfileLayer: string[] = [
      `identity: ${profile.identity}`,
      `mission: ${profile.mission}`,
      `revenue_model: ${profile.revenue_model}`,
      `brand_voice: ${profile.brand_voice}`,
      `approved_language: ${profile.approved_language.join(", ")}`,
      `banned_language: ${profile.banned_language.join(", ")}`,
      `pricing_notes: ${profile.pricing_notes}`,
      `compliance_caution: ${profile.compliance_caution}`,
    ];

    const securityCompliance: string[] = [
      "Security + compliance is always loaded first and overrides everything below it.",
      ...(profile.compliance_caution ? [`compliance_caution: ${profile.compliance_caution}`] : []),
      ...profile.compliance_risks.map((r) => `compliance_risk: ${r}`),
      ...(profile.banned_language.length > 0
        ? [`banned_language: ${profile.banned_language.join(", ")}`]
        : []),
    ];

    const defaults: Record<BusinessContextLayer, string[]> = {
      security_compliance: securityCompliance,
      global_rules: [],
      founder_profile: [],
      department_instructions: [],
      role_instructions: [],
      skill_playbook: [],
      business_profile: businessProfileLayer,
      project_context: [],
      relationship_history: [],
      source_of_truth: profile.source_of_truth_systems.map((s) => `source_of_truth: ${s}`),
      task_instructions: [`task: ${input.task}`],
    };

    const layers: ContextStackEntry[] = CONTEXT_STACK_LAYER_ORDER.map((layer) => {
      const override = overrides[layer];
      const base = defaults[layer];
      return {
        layer,
        content: override !== undefined ? [...base, ...override] : base,
      };
    });

    const stack = ContextStackSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: profile.business_key,
      task: input.task,
      layers,
      brand_voice: profile.brand_voice,
      banned_language: profile.banned_language,
      compliance_caution: profile.compliance_caution,
      created_at: this.clock().toISOString(),
    });
    this.s.contextStacks.set(stack.id, stack);
    return stack;
  }

  listContextStacks(tenantId: string): ContextStack[] {
    return [...this.s.contextStacks.values()].filter((c) => c.tenant_id === tenantId);
  }

  // --- Cross-business guardrails ------------------------------------------

  /**
   * Pure predicate: returns true if the two business keys differ — i.e. combining their contexts
   * WOULD mix two businesses. Used to BLOCK cross-business contamination.
   */
  wouldMixBusinessContext(businessKeyA: string, businessKeyB: string): boolean {
    return businessKeyA !== businessKeyB;
  }

  /**
   * Enforce the rule "agents must never mix business contexts": THROWS if the two business keys
   * differ. Call this before combining anything from two scopes.
   */
  enforceNoCrossBusiness(a: string, b: string): void {
    if (this.wouldMixBusinessContext(a, b)) {
      throw new Error(
        `Cross-business context mixing is forbidden: "${a}" and "${b}" are different businesses. Each agent must operate within ONE business context.`,
      );
    }
  }

  /**
   * Assert two assembled context stacks belong to the same business. THROWS on mismatch. Guards the
   * invariant that no agent ever combines two businesses' stacks.
   */
  assertSingleBusiness(stackA: ContextStack, stackB: ContextStack): void {
    this.enforceNoCrossBusiness(stackA.business_key, stackB.business_key);
  }
}

// ===========================================================================
// Seed catalog — the FIVE Tier-1 businesses.
// ===========================================================================

export const TIER1_PROFILES: readonly UpsertBusinessProfileInput[] = [
  {
    business_key: "alfie2",
    tier: "tier_1",
    identity: "The adaptive executive operating system.",
    mission:
      "Turn Alyssa's ideas into executed, measurable, revenue-producing systems. Alfie2 manages and improves the platforms; it does NOT duplicate them.",
    revenue_model: "advisory + SaaS",
    brand_voice: "premium, direct, high-conviction",
    approved_language: ["measurable", "executed", "revenue-producing", "system"],
    banned_language: ["generic hype", "vague AI-consultant speak"],
    growth_channels: ["founder network", "advisory referrals"],
    source_of_truth_systems: ["Supabase", "Alfy2 monorepo"],
    current_priorities: ["ship business-aware execution", "protect founder time"],
    compliance_caution: "do not reveal proprietary algorithm mechanics in public copy",
    kpis: ["ideas executed", "revenue produced", "founder time saved"],
  },
  {
    business_key: "move_mi",
    tier: "tier_1",
    identity: "Moving/logistics platform (pronounced 'move me', NOT 'Move Miami').",
    mission: "Make local moving effortless and trustworthy for movers and the people who refer them.",
    revenue_model: "booking + referral fees + mover subscriptions",
    target_audiences: ["movers", "realtors", "property managers"],
    brand_voice: "friendly, local, trustworthy",
    growth_channels: ["local SEO", "referrals", "social"],
    compliance_caution: "accurate quotes; no unlicensed claims",
    kpis: ["bookings", "referral conversions", "mover subscriptions"],
  },
  {
    business_key: "divini_procure",
    tier: "tier_1",
    identity: "Developer/vendor/investor procurement marketplace.",
    mission: "Connect developers, vendors and investors through verified, fee-protected procurement.",
    revenue_model: "transaction fees + vendor subscriptions",
    target_audiences: ["developers", "vendors", "investors"],
    brand_voice: "professional, trust-building",
    compliance_caution: "protect transaction fees; verified vendor docs",
    kpis: ["transaction volume", "verified vendors", "fee capture"],
  },
  {
    business_key: "divini_partners",
    tier: "tier_1",
    identity: "Venues/vendors/sponsors marketplace.",
    mission: "Match venues, vendors and sponsors into high-value partnerships.",
    revenue_model: "sponsorship/ad + transaction + seat revenue",
    target_audiences: ["venues", "vendors", "sponsors"],
    brand_voice: "premium, partnership-led",
    compliance_caution: "honor partnership terms; transparent sponsorship disclosures",
    kpis: ["partnerships closed", "sponsorship revenue", "seats sold"],
  },
  {
    business_key: "stratalogic",
    tier: "tier_1",
    identity: "Clinician-facing clinical decision support + clinic OS.",
    mission: "Give clinicians evidence-based decision support and a clinic operating system.",
    revenue_model: "clinic SaaS + enterprise licensing",
    target_audiences: ["clinicians", "clinics", "health enterprises"],
    brand_voice: "clinical, cautious, evidence-based",
    banned_language: ["miracle", "cure", "guaranteed results"],
    compliance_risks: ["health/wellness claims", "consumer dosing", "HIPAA-adjacent data"],
    compliance_caution:
      "health/wellness caution; clinician sign-off; consumer-safe framing; NO consumer dosing; required disclaimers; HIPAA-adjacent care",
    kpis: ["clinics onboarded", "decision-support sessions", "enterprise licenses"],
  },
];
