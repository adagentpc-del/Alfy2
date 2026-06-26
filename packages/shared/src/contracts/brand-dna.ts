import { z } from "zod";

/**
 * Brand DNA Engine contracts. Every brand has its own identity, so the Media OS always knows which brand a
 * piece of content belongs to and applies the right voice, rules, and assets. Brands: Alyssa Personal,
 * Decoded Podcast, Funsies AI, Move Mi, Divini Partners, Divini Procure, StrataLogic, FounderOS, Oralia.
 * See docs/adr/ADR-0076-brand-dna.md. Mirrored in workers (Pydantic).
 */

export const BrandKeySchema = z.enum([
  "alyssa_personal", "decoded_podcast", "funsies_ai", "move_mi", "divini_partners",
  "divini_procure", "stratalogic", "founderos", "oralia",
]);
export type BrandKey = z.infer<typeof BrandKeySchema>;

/** A brand's full identity. */
export const BrandDnaSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  key: BrandKeySchema,
  name: z.string().min(1),
  voice: z.string().default(""),
  tone: z.string().default(""),
  writing_style: z.string().default(""),
  /** 0..1: 0 = no humor, 1 = very playful. */
  humor_level: z.number().min(0).max(1).default(0.3),
  professionalism: z.number().min(0).max(1).default(0.7),
  target_audience: z.string().default(""),
  content_pillars: z.array(z.string()).default([]),
  visual_identity: z.string().default(""),
  cta_style: z.string().default(""),
  posting_cadence: z.string().default(""),
  hashtags: z.array(z.string()).default([]),
  forbidden_topics: z.array(z.string()).default([]),
  approved_terminology: z.array(z.string()).default([]),
  preferred_colors: z.array(z.string()).default([]),
  approved_intro: z.string().default(""),
  approved_outro: z.string().default(""),
  approved_music: z.string().default(""),
  approved_sponsor_blocks: z.array(z.string()).default([]),
  approved_templates: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type BrandDna = z.infer<typeof BrandDnaSchema>;

/** Input to upsert a brand's DNA (overrides over the seeded defaults). */
export const UpsertBrandInputSchema = BrandDnaSchema.pick({
  key: true, name: true, voice: true, tone: true, writing_style: true, humor_level: true,
  professionalism: true, target_audience: true, content_pillars: true, cta_style: true,
  posting_cadence: true, hashtags: true, forbidden_topics: true, approved_terminology: true,
}).partial().extend({ key: BrandKeySchema });
export type UpsertBrandInput = z.infer<typeof UpsertBrandInputSchema>;
