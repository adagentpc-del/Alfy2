import { z } from "zod";

/**
 * Life Logistics Engine. Detects future events and auto-generates the preparation so Alyssa never has to
 * remember it — checklists, calendar blocks, and reminders (night-before, two-hours-before, after-event
 * follow-up, decompression time). See docs/adr/ADR-0094-life-logistics.md. Mirrored in workers.
 */

export const PrepCategorySchema = z.enum([
  "packing", "travel", "transportation", "hotel", "pet_care", "medication", "supplements", "clothing",
  "weather", "documents", "charging", "gifts", "business_materials", "presentation_materials",
  "networking", "reservations", "tickets", "follow_up", "recovery",
]);
export type PrepCategory = z.infer<typeof PrepCategorySchema>;

export const DetectEventInputSchema = z.object({
  description: z.string().min(1),
  starts_at: z.string().datetime(),
  overnight: z.boolean().default(false),
  travel: z.boolean().default(false),
  networking: z.boolean().default(false),
  has_pet: z.boolean().default(true),
  business_id: z.string().uuid().nullable().default(null),
});
export type DetectEventInput = z.infer<typeof DetectEventInputSchema>;

export const ChecklistSchema = z.object({
  category: PrepCategorySchema,
  items: z.array(z.string()).default([]),
});
export type Checklist = z.infer<typeof ChecklistSchema>;

export const ScheduledReminderSchema = z.object({
  at: z.string().datetime(),
  label: z.string().min(1),
});
export type ScheduledReminder = z.infer<typeof ScheduledReminderSchema>;

export const LogisticsCalendarBlockSchema = z.object({
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  label: z.string().min(1),
});
export type LogisticsCalendarBlock = z.infer<typeof LogisticsCalendarBlockSchema>;

/** The auto-generated logistics plan for an event. */
export const LogisticsPlanSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  event: z.string().min(1),
  starts_at: z.string().datetime(),
  checklists: z.array(ChecklistSchema).default([]),
  calendar_blocks: z.array(LogisticsCalendarBlockSchema).default([]),
  reminders: z.array(ScheduledReminderSchema).default([]),
  follow_ups: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type LogisticsPlan = z.infer<typeof LogisticsPlanSchema>;
