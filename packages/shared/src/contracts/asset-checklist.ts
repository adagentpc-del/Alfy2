import { z } from "zod";

/**
 * Business Asset Checklist contracts. Every business tracks whether it has the assets it needs — logo,
 * domain, email, landing page, social pages, decks, one-pager, pricing, offer, CRM, templates, scripts,
 * onboarding packet, contracts/NDA/terms/privacy policy, SOPs, analytics, payment links, lead list,
 * follow-up sequence, content calendar. The engine shows what's missing per business and recommends the
 * fastest, highest-leverage asset to create next. See docs/adr/ADR-0038-business-asset-checklist.md.
 * Mirrored in workers (Pydantic).
 */

/** The twenty-five tracked business asset kinds. */
export const BusinessAssetKindSchema = z.enum([
  "logo",
  "domain",
  "email",
  "landing_page",
  "social_pages",
  "pitch_deck",
  "investor_deck",
  "sales_deck",
  "one_pager",
  "pricing",
  "offer",
  "crm",
  "email_templates",
  "sales_scripts",
  "onboarding_packet",
  "contracts",
  "nda",
  "terms",
  "privacy_policy",
  "sops",
  "analytics",
  "payment_links",
  "lead_list",
  "follow_up_sequence",
  "content_calendar",
]);
export type BusinessAssetKind = z.infer<typeof BusinessAssetKindSchema>;

/** A business's asset checklist. */
export const AssetChecklistSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  business_name: z.string().min(1),
  present: z.array(BusinessAssetKindSchema).default([]),
  missing: z.array(BusinessAssetKindSchema).default([]),
  /** Fraction of the 25 assets present, 0..1. */
  completeness: z.number().min(0).max(1),
  /** The fastest, highest-leverage missing asset to create next (null when complete). */
  recommended_next: BusinessAssetKindSchema.nullable().default(null),
  recommendation_reason: z.string().default(""),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type AssetChecklist = z.infer<typeof AssetChecklistSchema>;

export const BuildChecklistInputSchema = z.object({
  business_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  /** The assets the business already has. */
  present: z.array(BusinessAssetKindSchema).default([]),
});
export type BuildChecklistInput = z.infer<typeof BuildChecklistInputSchema>;
