import { z } from "zod";

/**
 * Operating Manual Generator contracts. Every time a workflow becomes stable, Alfy² generates its SOP,
 * checklist, playbook, onboarding guide, training document, troubleshooting guide, KPIs, and ownership
 * matrix, and stores them in the Asset Library — treating every successful workflow as reusable IP. See
 * docs/adr/ADR-0055-operating-manual-generator.md. Mirrored in workers (Pydantic).
 *
 * Workflow-triggered (a stable workflow → its manual), distinct from the domain-triggered Enterprise
 * Playbook Generator (ADR-0028, business/domain → playbook).
 */

/** The eight manual artifacts. */
export const ManualArtifactKindSchema = z.enum([
  "sop",
  "checklist",
  "playbook",
  "onboarding_guide",
  "training_document",
  "troubleshooting_guide",
  "kpis",
  "ownership_matrix",
]);
export type ManualArtifactKind = z.infer<typeof ManualArtifactKindSchema>;

/** A generated manual artifact (content saved to the Asset Library by reference). */
export const ManualArtifactSchema = z.object({
  kind: ManualArtifactKindSchema,
  title: z.string().min(1),
  /** Asset Library reference (never the payload). */
  asset_id: z.string().min(1),
  outline: z.array(z.string()).default([]),
});
export type ManualArtifact = z.infer<typeof ManualArtifactSchema>;

/** Input describing a stabilized workflow. */
export const GenerateManualInputSchema = z.object({
  workflow_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  purpose: z.string().default(""),
  steps: z.array(z.string()).default([]),
  owners: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
  /** Whether the workflow is stable enough to document (gate). */
  is_stable: z.boolean().default(true),
});
export type GenerateManualInput = z.infer<typeof GenerateManualInputSchema>;

/** The complete operating manual for a workflow. */
export const OperatingManualSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  workflow_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  artifacts: z.array(ManualArtifactSchema).default([]),
  /** Reusable IP marker. */
  reusable_ip: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type OperatingManual = z.infer<typeof OperatingManualSchema>;
