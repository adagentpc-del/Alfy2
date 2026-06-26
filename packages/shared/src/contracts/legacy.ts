import { z } from "zod";

/**
 * Legacy Engine contracts. Ensures every meaningful insight, system, framework, lesson, relationship, and
 * piece of IP becomes part of Alyssa's long-term legacy. Tracks frameworks, playbooks, operating manuals,
 * podcast lessons, books, talks, business systems, decision journals, mistakes, and successes; and when it
 * recognizes repeatable knowledge, asks whether it should become an SOP, a FounderOS feature, a course, a
 * podcast episode, a keynote, a book chapter, a licensing opportunity, or a consulting framework. The goal:
 * an enduring body of IP that compounds in value over decades. See docs/adr/ADR-0083-legacy-engine.md.
 */

export const LegacyItemKindSchema = z.enum([
  "framework", "playbook", "operating_manual", "podcast_lesson", "book", "talk",
  "business_system", "decision_journal", "mistake", "success",
  // Executive Legacy Archive — a lifetime of work, searchable / versioned / connected
  "company", "podcast", "letter", "video", "voice_note", "journal", "case_study",
  "client_transformation", "business_philosophy",
]);
export type LegacyItemKind = z.infer<typeof LegacyItemKindSchema>;

/** The forms a piece of repeatable knowledge can take. */
export const LegacyFormSchema = z.enum([
  "sop", "founderos_feature", "course", "podcast_episode", "keynote", "book_chapter",
  "licensing_opportunity", "consulting_framework",
]);
export type LegacyForm = z.infer<typeof LegacyFormSchema>;

export const CaptureLegacyInputSchema = z.object({
  kind: LegacyItemKindSchema,
  title: z.string().min(1),
  detail: z.string().default(""),
  /** How repeatable / reusable the knowledge is, 0..1 (drives the recommended forms). */
  repeatability: z.number().min(0).max(1).default(0.5),
  /** Strategic / enduring value, 0..1. */
  strategic_value: z.number().min(0).max(1).default(0.5),
});
export type CaptureLegacyInput = z.infer<typeof CaptureLegacyInputSchema>;

/** A captured legacy item with its recommended legacy forms. */
export const LegacyItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: LegacyItemKindSchema,
  title: z.string().min(1),
  detail: z.string().default(""),
  repeatability: z.number().min(0).max(1),
  strategic_value: z.number().min(0).max(1),
  recommended_forms: z.array(LegacyFormSchema).default([]),
  /** 0..1 — long-term legacy value (repeatability × strategic value, weighted). */
  legacy_score: z.number().min(0).max(1),
  created_at: z.string().datetime(),
});
export type LegacyItem = z.infer<typeof LegacyItemSchema>;
