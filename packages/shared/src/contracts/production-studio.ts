import { z } from "zod";
import { BrandKeySchema } from "./brand-dna.js";

/**
 * Production Studio contracts. Stores reusable production assets (intros, outros, sponsor ads, music,
 * transitions, brand animations, logos, watermarks, b-roll, fonts, graphics, lower thirds, episode/video/
 * thumbnail templates, caption styles, editing rules) and, per brand, a production preset that runs
 * automatically AFTER approval (e.g. Decoded: Intro A, Outro B, Sponsor 1 after the first topic, blue
 * graphics, chapters, subtitles, clips, show notes, description, schedule). See
 * docs/adr/ADR-0078-production-studio.md. Mirrored in workers (Pydantic).
 */

export const ProductionAssetKindSchema = z.enum([
  "intro", "outro", "sponsor_ad", "music", "transition", "brand_animation", "logo", "watermark",
  "b_roll", "font", "graphic", "lower_third", "episode_template", "video_template",
  "thumbnail_template", "caption_style", "editing_rule",
]);
export type ProductionAssetKind = z.infer<typeof ProductionAssetKindSchema>;

/** A stored production asset (reference, never the payload). */
export const ProductionAssetSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  brand: BrandKeySchema,
  kind: ProductionAssetKindSchema,
  name: z.string().min(1),
  asset_ref: z.string().default(""),
  created_at: z.string().datetime(),
});
export type ProductionAsset = z.infer<typeof ProductionAssetSchema>;

/** A per-brand production preset — the automated post-approval pipeline. */
export const ProductionPresetSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  brand: BrandKeySchema,
  intro: z.string().default(""),
  outro: z.string().default(""),
  /** Where to insert sponsor blocks, e.g. "after_first_topic". */
  sponsor_placement: z.string().default(""),
  graphics_style: z.string().default(""),
  /** The automated steps that run after approval. */
  auto_steps: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ProductionPreset = z.infer<typeof ProductionPresetSchema>;

export const UpsertPresetInputSchema = z.object({
  brand: BrandKeySchema,
  intro: z.string().default(""),
  outro: z.string().default(""),
  sponsor_placement: z.string().default(""),
  graphics_style: z.string().default(""),
  auto_steps: z.array(z.string()).default([]),
});
export type UpsertPresetInput = z.infer<typeof UpsertPresetInputSchema>;
