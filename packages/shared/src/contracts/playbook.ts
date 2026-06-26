import { z } from "zod";
import { DomainKindSchema } from "./domain-model.js";

/**
 * Enterprise Playbook Generator contracts. For every business and domain, generate a full playbook —
 * SOPs, workflows, scripts, checklists, onboarding docs, training docs, role scorecards, KPIs,
 * escalation rules, and client-facing assets — so a domain ships as reusable operating IP rather than
 * tribal knowledge. See docs/adr/ADR-0028-enterprise-playbook-generator.md. Mirrored in workers.
 */

/** The ten artifact kinds a playbook produces. */
export const PlaybookArtifactKindSchema = z.enum([
  "sop",
  "workflow",
  "script",
  "checklist",
  "onboarding_doc",
  "training_doc",
  "role_scorecard",
  "kpi",
  "escalation_rule",
  "client_asset",
]);
export type PlaybookArtifactKind = z.infer<typeof PlaybookArtifactKindSchema>;

/** One generated artifact. */
export const PlaybookArtifactSchema = z.object({
  kind: PlaybookArtifactKindSchema,
  title: z.string().min(1),
  body: z.string().default(""),
  tags: z.array(z.string()).default([]),
});
export type PlaybookArtifact = z.infer<typeof PlaybookArtifactSchema>;

/** A full playbook for one domain (optionally scoped to a business). */
export const PlaybookSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  domain: DomainKindSchema,
  business_id: z.string().uuid().nullable().default(null),
  business_name: z.string().default(""),
  name: z.string().min(1),
  artifacts: z.array(PlaybookArtifactSchema).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Playbook = z.infer<typeof PlaybookSchema>;

export const GeneratePlaybookInputSchema = z.object({
  domain: DomainKindSchema,
  business_name: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
});
export type GeneratePlaybookInput = z.infer<typeof GeneratePlaybookInputSchema>;
