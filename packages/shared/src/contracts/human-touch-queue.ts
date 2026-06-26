import { z } from "zod";

/**
 * Human Touch Queue. Do as much as possible autonomously, then batch all required Alyssa actions into one
 * clean approval/setup session instead of interrupting her repeatedly. Alfy² never stops the build on a
 * permission request, key, OAuth login, credential paste, billing confirmation, or OS/browser/file
 * permission — it continues all non-blocked work, logs the required human action with why it is needed, the
 * exact steps, copy/paste values, and a risk level, and queues it. Items are MUTABLE (pending → done /
 * skipped). The queue summary buckets work as: ready for Alyssa, can continue without Alyssa, truly blocked,
 * waiting for permission, ready to launch. See docs/adr/ADR-0145-human-touch-queue.md. Mirrored in workers.
 */

export const HumanTouchCategorySchema = z.enum([
  "approve", "paste_secret", "login", "allow_permission", "verify_domain", "click_button",
  "run_terminal_command", "review_legal_money_security", "final_launch_approval",
]);
export type HumanTouchCategory = z.infer<typeof HumanTouchCategorySchema>;

export const HumanTouchStatusSchema = z.enum(["pending", "done", "skipped"]);
export type HumanTouchStatus = z.infer<typeof HumanTouchStatusSchema>;

export const QueueHumanTouchInputSchema = z.object({
  category: HumanTouchCategorySchema,
  title: z.string().min(1),
  why: z.string().default(""),
  steps: z.array(z.string()).default([]),
  copy_paste_value: z.string().nullable().default(null),
  risk_level: z.enum(["low", "medium", "high"]).default("low"),
  /** What build / module this unblocks, when applicable. */
  build_ref: z.string().nullable().default(null),
});
export type QueueHumanTouchInput = z.infer<typeof QueueHumanTouchInputSchema>;

/** One queued human-only action. Mutable — status changes when Alyssa handles it. */
export const HumanTouchItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  category: HumanTouchCategorySchema,
  title: z.string().min(1),
  why: z.string().default(""),
  steps: z.array(z.string()).default([]),
  copy_paste_value: z.string().nullable().default(null),
  risk_level: z.enum(["low", "medium", "high"]).default("low"),
  status: HumanTouchStatusSchema.default("pending"),
  build_ref: z.string().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type HumanTouchItem = z.infer<typeof HumanTouchItemSchema>;

/** The batched session view. A read-model computed from the pending items. */
export const HumanTouchSummarySchema = z.object({
  ready_for_alyssa: z.array(z.string()).default([]),
  waiting_for_permission: z.array(z.string()).default([]),
  truly_blocked: z.array(z.string()).default([]),
  ready_to_launch: z.array(z.string()).default([]),
  /** Count Alfy² can keep progressing without Alyssa right now. */
  can_continue_without_alyssa: z.number().int().nonnegative().default(0),
  summary: z.string().min(1),
});
export type HumanTouchSummary = z.infer<typeof HumanTouchSummarySchema>;
