import { z } from "zod";

/**
 * Knowledge-to-Action Converter contracts. Knowledge must not sit unused. For every useful idea the
 * engine creates an action item, a business use case, an implementation plan, a revenue hypothesis, the
 * required assets and agents, a test plan, an owner, a deadline, and a dashboard card — and decides:
 * use now, save for later, ignore, or convert into a campaign. Every workflow becomes reusable IP (an
 * operating manual). See docs/adr/ADR-0031-knowledge-to-action-converter.md. Mirrored in workers.
 */

/** The four dispositions for a converted idea. */
export const ActionDispositionSchema = z.enum(["use_now", "save_for_later", "ignore", "convert_to_campaign"]);
export type ActionDisposition = z.infer<typeof ActionDispositionSchema>;

/** A converted idea — a ready-to-execute action with a reusable operating manual. */
export const KnowledgeActionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  idea: z.string().min(1),
  action_item: z.string().min(1),
  business_use_case: z.string().default(""),
  implementation_plan: z.array(z.string()).default([]),
  revenue_hypothesis: z.string().default(""),
  required_assets: z.array(z.string()).default([]),
  required_agents: z.array(z.string()).default([]),
  test_plan: z.array(z.string()).default([]),
  owner: z.string().default("owner"),
  deadline: z.string().datetime().nullable().default(null),
  dashboard_card: z.string().default(""),
  disposition: ActionDispositionSchema,
  /** The reusable IP — an internal operating manual for this workflow. */
  operating_manual: z.string().default(""),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type KnowledgeAction = z.infer<typeof KnowledgeActionSchema>;

/** Input to convert an idea into action. */
export const ConvertIdeaInputSchema = z.object({
  idea: z.string().min(1),
  owner: z.string().default("owner"),
  business: z.string().nullable().default(null),
  /** 0..1 signal of how strong/valuable the idea is — drives the disposition. */
  value_signal: z.number().min(0).max(1).default(0.5),
  /** Whether the idea is marketing/campaign-shaped (steers toward convert_to_campaign). */
  is_campaign_shaped: z.boolean().default(false),
  deadline: z.string().datetime().nullable().default(null),
});
export type ConvertIdeaInput = z.infer<typeof ConvertIdeaInputSchema>;
