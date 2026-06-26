import { z } from "zod";

/**
 * PR & Authority Engine contracts. Owns the authority asset stack (media kit, speaker kit, founder/company
 * bios, press releases, award submissions, podcast pitches, conference submissions, guest articles,
 * journalist database, case studies, thought leadership, book/TV opportunities, industry rankings,
 * credibility assets) and automatically identifies PR opportunities from company launches, partnerships,
 * funding, customer wins, industry trends, and technology innovations — generating pitches for approval.
 * See docs/adr/ADR-0080-pr-authority.md. Mirrored in workers (Pydantic).
 */

/** The triggers that create a PR opportunity. */
export const PrTriggerSchema = z.enum([
  "company_launch", "major_partnership", "funding", "customer_win", "industry_trend", "technology_innovation",
]);
export type PrTrigger = z.infer<typeof PrTriggerSchema>;

export const PrOpportunityStatusSchema = z.enum(["identified", "pitch_drafted", "approved", "sent", "won", "passed"]);
export type PrOpportunityStatus = z.infer<typeof PrOpportunityStatusSchema>;

export const DetectPrInputSchema = z.object({
  trigger: PrTriggerSchema,
  headline: z.string().min(1),
  business_name: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  detail: z.string().default(""),
});
export type DetectPrInput = z.infer<typeof DetectPrInputSchema>;

/** A detected PR opportunity with a drafted (un-sent) pitch. */
export const PrOpportunitySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  trigger: PrTriggerSchema,
  headline: z.string().min(1),
  business_name: z.string().default(""),
  angle: z.string().min(1),
  target_outlets: z.array(z.string()).default([]),
  drafted_pitch: z.string().min(1),
  credibility_assets_needed: z.array(z.string()).default([]),
  status: PrOpportunityStatusSchema.default("identified"),
  /** Pitches are never sent without approval. */
  approved_to_send: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type PrOpportunity = z.infer<typeof PrOpportunitySchema>;

/** The authority asset kinds the engine can assemble. */
export const AuthorityAssetKindSchema = z.enum([
  "media_kit", "speaker_kit", "founder_bio", "company_bio", "press_release", "award_submission",
  "podcast_pitch", "conference_submission", "guest_article", "case_study", "thought_leadership", "credibility_asset",
]);
export type AuthorityAssetKind = z.infer<typeof AuthorityAssetKindSchema>;

export const AuthorityAssetSchema = z.object({
  kind: AuthorityAssetKindSchema,
  title: z.string().min(1),
  asset_id: z.string().min(1),
  outline: z.array(z.string()).default([]),
});
export type AuthorityAsset = z.infer<typeof AuthorityAssetSchema>;
