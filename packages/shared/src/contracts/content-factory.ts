import { z } from "zod";

/**
 * Content Factory contracts. One piece of content creates a full, linked package — 1 long YouTube, 5
 * Shorts, 5 Reels, 10 X posts, 5 LinkedIn posts, 3 carousels, a newsletter, a blog, podcast clips, a
 * website article, an email, a sales asset, a PR angle, a speaker story, and a case study — all linked to
 * the source so nothing is ever created twice. See docs/adr/ADR-0077-content-factory.md. Mirrored.
 */

export const ContentPieceKindSchema = z.enum([
  "youtube_long", "short", "reel", "x_post", "linkedin_post", "carousel", "newsletter",
  "blog", "podcast_clip", "website_article", "email", "sales_asset", "pr_angle",
  "speaker_story", "case_study",
]);
export type ContentPieceKind = z.infer<typeof ContentPieceKindSchema>;

/** The canonical multiplication plan: how many of each kind one source produces. */
export const CONTENT_MULTIPLIER: Record<string, number> = {
  youtube_long: 1, short: 5, reel: 5, x_post: 10, linkedin_post: 5, carousel: 3, newsletter: 1,
  blog: 1, podcast_clip: 5, website_article: 1, email: 1, sales_asset: 1, pr_angle: 1,
  speaker_story: 1, case_study: 1,
};

/** One produced piece, linked to the source. */
export const ContentPieceSchema = z.object({
  kind: ContentPieceKindSchema,
  index: z.number().int().nonnegative(),
  title: z.string().min(1),
  /** Asset Library reference. */
  asset_id: z.string().min(1),
});
export type ContentPiece = z.infer<typeof ContentPieceSchema>;

export const BuildPackageInputSchema = z.object({
  source_title: z.string().min(1),
  /** Source content reference (e.g. the Media OS job or a transcript ref). */
  source_ref: z.string().default(""),
  brand: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
});
export type BuildPackageInput = z.infer<typeof BuildPackageInputSchema>;

/** A complete content package — all derivatives linked to one source. */
export const ContentPackageSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  source_title: z.string().min(1),
  source_ref: z.string().default(""),
  brand: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  pieces: z.array(ContentPieceSchema).default([]),
  total_pieces: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});
export type ContentPackage = z.infer<typeof ContentPackageSchema>;
