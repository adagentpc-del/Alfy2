import { z } from "zod";

/**
 * FounderOS Commercialization Layer contracts. Alfy² is Tenant 001, designed so it can later become
 * FounderOS. Every internal feature is classified by its commercialization tier — personal-only, business
 * reusable, founder SaaS feature, agency service, or enterprise product — and flagged for whether it could
 * become a SaaS module. This is preparation only: nothing is commercialized yet. See
 * docs/adr/ADR-0049-founderos-commercialization.md. Mirrored in workers (Pydantic).
 */

/** The five commercialization tiers. */
export const CommercializationTierSchema = z.enum([
  "personal_only",
  "business_reusable",
  "founder_saas_feature",
  "agency_service",
  "enterprise_product",
]);
export type CommercializationTier = z.infer<typeof CommercializationTierSchema>;

/** A feature's commercialization classification. */
export const FeatureClassificationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  feature_name: z.string().min(1),
  tier: CommercializationTierSchema,
  /** Whether this could become a standalone SaaS module. */
  saas_module_candidate: z.boolean().default(false),
  rationale: z.string().default(""),
  /** How ready it is to be productized, 0..1 (architecture-prep signal only). */
  readiness: z.number().min(0).max(1).default(0),
  /** Always false for now — preparation only, not activation. */
  commercialized: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type FeatureClassification = z.infer<typeof FeatureClassificationSchema>;

export const ClassifyFeatureInputSchema = z.object({
  feature_name: z.string().min(1),
  tier: CommercializationTierSchema,
  saas_module_candidate: z.boolean().default(false),
  rationale: z.string().default(""),
  readiness: z.number().min(0).max(1).default(0),
});
export type ClassifyFeatureInput = z.infer<typeof ClassifyFeatureInputSchema>;
