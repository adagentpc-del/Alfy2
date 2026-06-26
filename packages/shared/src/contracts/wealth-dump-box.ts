import { z } from "zod";

/**
 * Wealth Architecture Dump Box contracts. A finance-specific dumping ground: Alyssa drops investment / tax
 * / trust / IRA / offshore / real-estate ideas, savings goals, wealth desires, screenshots, videos, book
 * notes, advisor notes, financial products, and business income plans. Each item is classified, summarized,
 * scoped (personal vs business), checked for legality/compliance, scored for upside and risk, linked to
 * goals, given advisor questions, saved to the Wealth Knowledge Vault, and given a next action. See
 * docs/adr/ADR-0064-wealth-dump-box.md. Mirrored in workers (Pydantic).
 */

export const WealthItemKindSchema = z.enum([
  "investment_idea",
  "tax_idea",
  "trust_idea",
  "ira_idea",
  "offshore_idea",
  "real_estate_idea",
  "savings_goal",
  "wealth_desire",
  "screenshot",
  "video",
  "book_note",
  "advisor_note",
  "financial_product",
  "business_income_plan",
]);
export type WealthItemKind = z.infer<typeof WealthItemKindSchema>;

export const WealthScopeSchema = z.enum(["personal", "business", "both", "unclear"]);
export type WealthScope = z.infer<typeof WealthScopeSchema>;

export const WealthDropSchema = z.object({
  kind: WealthItemKindSchema,
  title: z.string().min(1),
  content: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
});
export type WealthDrop = z.infer<typeof WealthDropSchema>;

/** A processed wealth item — the 10-step pipeline output. */
export const WealthItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: WealthItemKindSchema,
  title: z.string().min(1),
  summary: z.string().default(""),
  scope: WealthScopeSchema,
  legality_notes: z.string().default(""),
  /** Upside / risk on a 0..1 scale. */
  upside: z.number().min(0).max(1).default(0.5),
  risk: z.number().min(0).max(1).default(0.5),
  linked_goals: z.array(z.string()).default([]),
  advisor_questions: z.array(z.string()).default([]),
  /** Wealth Knowledge Vault reference (never the payload). */
  vault_asset_id: z.string().min(1),
  next_action: z.string().min(1),
  requires_professional_review: z.boolean().default(true),
  created_at: z.string().datetime(),
});
export type WealthItem = z.infer<typeof WealthItemSchema>;
