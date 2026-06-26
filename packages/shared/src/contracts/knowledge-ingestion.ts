import { z } from "zod";

/**
 * Knowledge Ingestion Engine contracts. Anything Alyssa uploads or saves — books, PDFs, YouTube
 * transcripts, podcasts, courses, articles, screenshots, notes, videos, GitHub repos, competitor pages
 * — is processed into structured, reusable knowledge: a summary, extracted frameworks/tactics/business
 * applications, which businesses it applies to, monetization use cases, suggested SOPs and agents, an
 * Asset Library reference, and links to relevant goals, campaigns, and businesses. See
 * docs/adr/ADR-0030-knowledge-ingestion-engine.md. Mirrored in workers (Pydantic).
 */

/** The eleven source types the engine ingests. */
export const KnowledgeSourceTypeSchema = z.enum([
  "book",
  "pdf",
  "youtube_transcript",
  "podcast",
  "course",
  "article",
  "screenshot",
  "note",
  "video",
  "github_repo",
  "competitor_page",
]);
export type KnowledgeSourceType = z.infer<typeof KnowledgeSourceTypeSchema>;

/** A fully processed knowledge item. */
export const IngestedItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  source_type: KnowledgeSourceTypeSchema,
  title: z.string().min(1),
  /** Where the source lives (a path/url/ref) — never the payload itself. */
  location: z.string().default(""),
  summary: z.string().default(""),
  frameworks: z.array(z.string()).default([]),
  tactics: z.array(z.string()).default([]),
  business_applications: z.array(z.string()).default([]),
  /** Which businesses this applies to (matched by name/keyword). */
  applies_to: z.array(z.string()).default([]),
  monetization_use_cases: z.array(z.string()).default([]),
  suggested_sops: z.array(z.string()).default([]),
  suggested_agents: z.array(z.string()).default([]),
  /** Reference to the Global Asset Library entry created for this item. */
  asset_id: z.string().nullable().default(null),
  linked_goals: z.array(z.string()).default([]),
  linked_campaigns: z.array(z.string()).default([]),
  linked_businesses: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type IngestedItem = z.infer<typeof IngestedItemSchema>;

/** Input to ingest an item. `content` is the extracted text the engine processes. */
export const IngestInputSchema = z.object({
  source_type: KnowledgeSourceTypeSchema,
  title: z.string().min(1),
  content: z.string().default(""),
  location: z.string().default(""),
  /** Known business names/keywords, used to match which businesses the item applies to. */
  businesses: z.array(z.string()).default([]),
  /** Known goal names to link to. */
  goals: z.array(z.string()).default([]),
  /** Known campaign names to link to. */
  campaigns: z.array(z.string()).default([]),
});
export type IngestInput = z.infer<typeof IngestInputSchema>;
