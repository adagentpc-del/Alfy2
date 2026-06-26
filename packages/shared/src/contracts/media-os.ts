import { z } from "zod";

/**
 * Media Operating System contracts. Mission: give Alyssa her life back while maintaining an elite media
 * presence — she should spend her time living, building, traveling, networking, learning, and recording
 * ideas, NOT editing. The Media OS transforms one raw moment into many finished, brand-correct media assets
 * (right account, voice, intro/outro, captions, CTA, schedule, tracking). Maximum leverage from minimum
 * effort. See docs/adr/ADR-0075-media-os.md. Mirrored in workers (Pydantic).
 */

/** Raw input kinds. */
export const MediaInputKindSchema = z.enum([
  "raw_video", "podcast", "photo", "screenshot", "voice_note", "written_thought",
  "meeting_recording", "interview", "webinar", "presentation", "livestream",
]);
export type MediaInputKind = z.infer<typeof MediaInputKindSchema>;

/** Output asset kinds. */
export const MediaOutputKindSchema = z.enum([
  "podcast_episode", "reel", "tiktok", "youtube_short", "youtube_video", "linkedin_post",
  "x_post", "instagram_carousel", "newsletter", "blog", "pr_story", "email",
]);
export type MediaOutputKind = z.infer<typeof MediaOutputKindSchema>;

export const MediaJobStatusSchema = z.enum(["queued", "processing", "awaiting_approval", "approved", "scheduled"]);
export type MediaJobStatus = z.infer<typeof MediaJobStatusSchema>;

export const IngestMediaInputSchema = z.object({
  kind: MediaInputKindSchema,
  title: z.string().min(1),
  /** Reference to the raw source (Asset Library / storage); never the payload. */
  source_ref: z.string().default(""),
  /** The brand this belongs to (the Media OS resolves it if blank). */
  brand: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  /** Which outputs to produce; empty = the default set for this input kind. */
  outputs: z.array(MediaOutputKindSchema).default([]),
});
export type IngestMediaInput = z.infer<typeof IngestMediaInputSchema>;

/** One produced media asset (a plan/reference; rendering happens downstream after approval). */
export const MediaAssetSchema = z.object({
  kind: MediaOutputKindSchema,
  title: z.string().min(1),
  /** Brand-applied caption/copy outline. */
  outline: z.array(z.string()).default([]),
  cta: z.string().default(""),
  /** Asset Library reference for the produced asset. */
  asset_id: z.string().min(1),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

/** A media job: one input → many assets. */
export const MediaJobSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: MediaInputKindSchema,
  title: z.string().min(1),
  brand: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  status: MediaJobStatusSchema.default("queued"),
  assets: z.array(MediaAssetSchema).default([]),
  /** Nothing publishes until Alyssa approves. */
  requires_approval: z.literal(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type MediaJob = z.infer<typeof MediaJobSchema>;
