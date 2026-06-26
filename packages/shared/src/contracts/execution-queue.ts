import { z } from "zod";

/**
 * Execution Queue contracts. Separates work into eight buckets — ideas, tasks, approved actions,
 * blocked actions, waiting on Alyssa, automated workflows, money actions, risk actions — and ranks it
 * by a fixed priority order (revenue → risk → deadlines → follow-up → operations → personal admin →
 * nice-to-have). The system always knows what to do next. See
 * docs/adr/ADR-0036-execution-queue.md. Mirrored in workers (Pydantic).
 */

/** The eight queue buckets. */
export const QueueBucketSchema = z.enum([
  "idea",
  "task",
  "approved_action",
  "blocked_action",
  "waiting_on_alyssa",
  "automated_workflow",
  "money_action",
  "risk_action",
]);
export type QueueBucket = z.infer<typeof QueueBucketSchema>;

/** The seven priority categories, in descending priority order. */
export const QueueCategorySchema = z.enum([
  "revenue",
  "risk",
  "deadline",
  "follow_up",
  "operations",
  "personal_admin",
  "nice_to_have",
]);
export type QueueCategory = z.infer<typeof QueueCategorySchema>;

/** One item in the execution queue. */
export const QueueItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  bucket: QueueBucketSchema,
  category: QueueCategorySchema,
  title: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  value_usd: z.number().nonnegative().default(0),
  due: z.string().datetime().nullable().default(null),
  /** Whether the item can be acted on now (false for blocked / waiting-on-Alyssa). */
  actionable: z.boolean().default(true),
  done: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type QueueItem = z.infer<typeof QueueItemSchema>;

export const AddQueueItemInputSchema = z.object({
  bucket: QueueBucketSchema,
  category: QueueCategorySchema,
  title: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  value_usd: z.number().nonnegative().default(0),
  due: z.string().datetime().nullable().default(null),
  actionable: z.boolean().default(true),
});
export type AddQueueItemInput = z.infer<typeof AddQueueItemInputSchema>;
