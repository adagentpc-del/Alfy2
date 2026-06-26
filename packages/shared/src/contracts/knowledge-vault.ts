import { z } from "zod";

/**
 * Knowledge Vault contracts. Everything Alyssa drops in becomes usable intelligence, then execution.
 * The mission: knowledge is not valuable until converted into asset → campaign → conversation →
 * conversion → cash. For every dropped item the Vault extracts key ideas, frameworks, tactics, quotes,
 * examples, business applications, monetization opportunities, related businesses/agents/assets, and
 * action items — and never just stores it. See docs/adr/ADR-0040-knowledge-vault.md. Mirrored in workers.
 */

/** The thirteen input kinds the Vault accepts. */
export const VaultInputKindSchema = z.enum([
  "book",
  "pdf",
  "youtube_transcript",
  "podcast",
  "course",
  "screenshot",
  "website",
  "github_repo",
  "article",
  "competitor_page",
  "voice_note",
  "meeting_notes",
  "random_idea",
]);
export type VaultInputKind = z.infer<typeof VaultInputKindSchema>;

/** An item dropped into the Vault. */
export const VaultDropSchema = z.object({
  kind: VaultInputKindSchema,
  title: z.string().min(1),
  /** The raw text/transcript/notes (real media parsing is supplied upstream). */
  content: z.string().default(""),
  business_ids: z.array(z.string().uuid()).default([]),
  /** Free-text names of businesses this might apply to (matched against content). */
  businesses: z.array(z.string()).default([]),
});
export type VaultDrop = z.infer<typeof VaultDropSchema>;

/** The extracted intelligence for one item. */
export const VaultExtractionSchema = z.object({
  key_ideas: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  tactics: z.array(z.string()).default([]),
  quotes: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([]),
  business_applications: z.array(z.string()).default([]),
  monetization_opportunities: z.array(z.string()).default([]),
  related_businesses: z.array(z.string()).default([]),
  related_agents: z.array(z.string()).default([]),
  related_assets: z.array(z.string()).default([]),
  action_items: z.array(z.string()).default([]),
});
export type VaultExtraction = z.infer<typeof VaultExtractionSchema>;

/** A stored, converted Vault entry — intelligence plus the start of the execution chain. */
export const VaultEntrySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: VaultInputKindSchema,
  title: z.string().min(1),
  summary: z.string().default(""),
  extraction: VaultExtractionSchema,
  /** Asset Library reference for the saved source (never the payload). */
  asset_id: z.string().min(1),
  /** The execution chain this knowledge feeds: asset → campaign → conversation → conversion → cash. */
  converted_to_actions: z.number().int().nonnegative().default(0),
  linked_business_ids: z.array(z.string().uuid()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type VaultEntry = z.infer<typeof VaultEntrySchema>;
