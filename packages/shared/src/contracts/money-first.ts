import { z } from "zod";

/**
 * Money-First Operating Mode contracts. When activated, Alfy² prioritizes only the activities that move
 * cash — cash collection, sales, follow-up, booked calls, proposals, invoices, high-conversion content,
 * warm relationships, low-friction offers — and deprioritizes perfection, branding polish, unnecessary
 * features, low-conversion ideas, and research without action. The goal is to convert the speed of ideas
 * into money through execution. See docs/adr/ADR-0039-money-first-operating-mode.md. Mirrored in workers.
 */

/** The nine money-aligned focuses that get prioritized. */
export const MoneyFocusSchema = z.enum([
  "cash_collection",
  "sales",
  "follow_up",
  "booked_calls",
  "proposals",
  "invoices",
  "high_conversion_content",
  "warm_relationships",
  "low_friction_offers",
]);
export type MoneyFocus = z.infer<typeof MoneyFocusSchema>;

/** The five things deprioritized in money-first mode. */
export const MoneyDeprioritySchema = z.enum([
  "perfection",
  "branding_polish",
  "unnecessary_features",
  "low_conversion_ideas",
  "research_without_action",
]);
export type MoneyDepriority = z.infer<typeof MoneyDeprioritySchema>;

/** How an item is treated in money-first mode. */
export const MoneyClassificationSchema = z.enum(["prioritize", "deprioritize", "neutral"]);
export type MoneyClassification = z.infer<typeof MoneyClassificationSchema>;

/** The mode state for a tenant. */
export const MoneyFirstStateSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  active: z.boolean().default(false),
  activated_at: z.string().datetime().nullable().default(null),
  updated_at: z.string().datetime(),
});
export type MoneyFirstState = z.infer<typeof MoneyFirstStateSchema>;

/** A work item to be classified/reordered. */
export const WorkItemSchema = z.object({
  title: z.string().min(1),
  /** Optional explicit category (otherwise inferred from the title). */
  category: z.string().default(""),
});
export type WorkItem = z.infer<typeof WorkItemSchema>;

/** The result of classifying a work item. */
export const ClassifiedItemSchema = z.object({
  title: z.string().min(1),
  classification: MoneyClassificationSchema,
  /** The matched money focus (if prioritized) or depriority (if deprioritized). */
  matched: z.string().default(""),
  reason: z.string().min(1),
});
export type ClassifiedItem = z.infer<typeof ClassifiedItemSchema>;
