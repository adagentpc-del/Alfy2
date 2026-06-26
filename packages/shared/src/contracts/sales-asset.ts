import { z } from "zod";

/**
 * Sales Asset Generator contracts. For any business, generate a full sales kit — a one-pager, pitch
 * deck, investor deck, sales deck, proposal, email sequence, DM script, call script, objection
 * handling, FAQ, case study template, and onboarding packet — and save each to the Asset Library. See
 * docs/adr/ADR-0035-sales-asset-generator.md. Mirrored in workers (Pydantic).
 */

/** The twelve sales asset kinds. */
export const SalesAssetKindSchema = z.enum([
  "one_pager",
  "pitch_deck",
  "investor_deck",
  "sales_deck",
  "proposal",
  "email_sequence",
  "dm_script",
  "call_script",
  "objection_handling",
  "faq",
  "case_study_template",
  "onboarding_packet",
]);
export type SalesAssetKind = z.infer<typeof SalesAssetKindSchema>;

/** One generated sales asset, with its Asset Library reference. */
export const GeneratedSalesAssetSchema = z.object({
  kind: SalesAssetKindSchema,
  title: z.string().min(1),
  body: z.string().default(""),
  /** Reference to the Global Asset Library entry saved for this asset. */
  asset_id: z.string().nullable().default(null),
});
export type GeneratedSalesAsset = z.infer<typeof GeneratedSalesAssetSchema>;

/** A full generated sales kit for a business. */
export const SalesAssetPackSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  business_name: z.string().min(1),
  assets: z.array(GeneratedSalesAssetSchema).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type SalesAssetPack = z.infer<typeof SalesAssetPackSchema>;

export const GenerateSalesAssetsInputSchema = z.object({
  business_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  /** The headline offer the kit sells. */
  offer: z.string().default(""),
  /** The target audience the kit addresses. */
  audience: z.string().default(""),
});
export type GenerateSalesAssetsInput = z.infer<typeof GenerateSalesAssetsInputSchema>;
