import { z } from "zod";

/**
 * Business Operating Profile + Context Stack.
 *
 * This powers BUSINESS-AWARE EXECUTION: "same global skill, different business execution." Every
 * business gets a rich operating profile, and every agent assembles a CONTEXT STACK scoped to ONE
 * business — never mixing two businesses' contexts. Move Mi marketing must not use Divini Procure
 * pricing; Black Flag fundraising must not borrow aggressive sales language; StrataLogic must always
 * carry its health/wellness caution + required disclaimers.
 *
 * This is DISTINCT from the existing `business` contract (business.ts), which models business
 * STRUCTURE + data-namespace isolation. Here a business is referenced only by a string
 * `business_key`; this contract adds the OPERATING PROFILE content + the context-stack assembler.
 *
 * NOTE: every exported schema + type is uniquely prefixed (Business / BusinessProfile / Profile /
 * ContextStack) to avoid barrel export-name collisions (business.ts already owns `Business`,
 * `BusinessSchema`, `DepartmentKind`).
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 */

// ---------------------------------------------------------------------------
// Enums (uniquely named to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** Strategic tier of a business in the portfolio. */
export const BusinessTierSchema = z.enum(["tier_1", "tier_2", "tier_3"]);
export type BusinessTier = z.infer<typeof BusinessTierSchema>;

/** Operating status of a business profile. */
export const BusinessProfileStatusSchema = z.enum(["active", "paused", "archived"]);
export type BusinessProfileStatus = z.infer<typeof BusinessProfileStatusSchema>;

/**
 * The EXACT 11-layer context-stack load order from the spec. Layer 1 (security_compliance) is
 * always loaded first; task_instructions are always last. Agents assemble context in this order
 * for ONE business at a time.
 */
export const BusinessContextLayerSchema = z.enum([
  "security_compliance",
  "global_rules",
  "founder_profile",
  "department_instructions",
  "role_instructions",
  "skill_playbook",
  "business_profile",
  "project_context",
  "relationship_history",
  "source_of_truth",
  "task_instructions",
]);
export type BusinessContextLayer = z.infer<typeof BusinessContextLayerSchema>;

// ---------------------------------------------------------------------------
// Business Operating Profile (mutable)
// ---------------------------------------------------------------------------

/** A single offer a business sells. */
export const ProfileOfferSchema = z.object({
  name: z.string().min(1),
  price: z.string().default(""),
  terms: z.string().default(""),
});
export type ProfileOffer = z.infer<typeof ProfileOfferSchema>;

export const BusinessOperatingProfileSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** References a business by key (see business.ts for the structural business record). */
  business_key: z.string().min(1),
  tier: BusinessTierSchema.default("tier_1"),
  identity: z.string().default(""),
  mission: z.string().default(""),
  revenue_model: z.string().default(""),
  offers: z.array(ProfileOfferSchema).default([]),
  pricing_notes: z.string().default(""),
  target_audiences: z.array(z.string()).default([]),
  brand_voice: z.string().default(""),
  approved_language: z.array(z.string()).default([]),
  banned_language: z.array(z.string()).default([]),
  growth_channels: z.array(z.string()).default([]),
  platform_connections: z.array(z.string()).default([]),
  source_of_truth_systems: z.array(z.string()).default([]),
  active_campaigns: z.array(z.string()).default([]),
  current_priorities: z.array(z.string()).default([]),
  compliance_risks: z.array(z.string()).default([]),
  /** e.g. required disclaimers, clinician sign-off, consumer-safe framing. */
  compliance_caution: z.string().default(""),
  ai_skills_used: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
  improvement_backlog: z.array(z.string()).default([]),
  status: BusinessProfileStatusSchema.default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type BusinessOperatingProfile = z.infer<typeof BusinessOperatingProfileSchema>;

// ---------------------------------------------------------------------------
// Context Stack (assembled, business-scoped — append-only snapshot)
// ---------------------------------------------------------------------------

/** One layer of an assembled context stack. */
export const ContextStackEntrySchema = z.object({
  layer: BusinessContextLayerSchema,
  content: z.array(z.string()).default([]),
});
export type ContextStackEntry = z.infer<typeof ContextStackEntrySchema>;

export const ContextStackSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** The single business this stack is scoped to. Stacks NEVER mix business contexts. */
  business_key: z.string().min(1),
  task: z.string().min(1),
  /** The assembled layers, in the canonical 11-layer order. */
  layers: z.array(ContextStackEntrySchema).default([]),
  /** Pulled from the business profile — carried for fast guardrail checks. */
  brand_voice: z.string().default(""),
  banned_language: z.array(z.string()).default([]),
  compliance_caution: z.string().default(""),
  created_at: z.string().datetime(),
});
export type ContextStack = z.infer<typeof ContextStackSchema>;
