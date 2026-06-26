import { z } from "zod";

/**
 * Meeting Prep. Prepares Alyssa for every important interaction so each meeting feels like an executive team
 * prepared her beforehand. Before a meeting it assembles a full dossier (person & company profiles,
 * relationship & conversation history, mutual contacts, relevant news, open action items, negotiation
 * opportunities, talking points, questions, risks, supporting docs, objective, desired outcome). After a
 * meeting it captures a recap (summary, commitments, follow-ups, relationship-memory updates, next actions).
 * Both are APPEND-ONLY point-in-time records. Distinct from the lightweight MeetingPrep block inside the
 * Chief of Staff briefing. See docs/adr/ADR-0129-meeting-prep.md. Mirrored in workers.
 */

/** A recommended thing to say, grounded in context. */
export const MeetingTalkingPointSchema = z.object({
  point: z.string().min(1),
  rationale: z.string().default(""),
});
export type MeetingTalkingPoint = z.infer<typeof MeetingTalkingPointSchema>;

export const PrepareMeetingInputSchema = z.object({
  title: z.string().min(1),
  when: z.string().datetime().nullable().default(null),
  attendees: z.array(z.string()).default([]),
  company: z.string().nullable().default(null),
  objective: z.string().default(""),
});
export type PrepareMeetingInput = z.infer<typeof PrepareMeetingInputSchema>;

/** The pre-meeting dossier. Append-only — one per preparation. */
export const MeetingDossierSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  title: z.string().min(1),
  when: z.string().datetime().nullable().default(null),
  person_profile: z.string().default(""),
  company_profile: z.string().default(""),
  relationship_history: z.array(z.string()).default([]),
  conversation_history: z.array(z.string()).default([]),
  mutual_contacts: z.array(z.string()).default([]),
  relevant_news: z.array(z.string()).default([]),
  open_action_items: z.array(z.string()).default([]),
  negotiation_opportunities: z.array(z.string()).default([]),
  talking_points: z.array(MeetingTalkingPointSchema).default([]),
  questions_to_ask: z.array(z.string()).default([]),
  potential_risks: z.array(z.string()).default([]),
  supporting_documents: z.array(z.string()).default([]),
  objective: z.string().default(""),
  desired_outcome: z.string().default(""),
  created_at: z.string().datetime(),
});
export type MeetingDossier = z.infer<typeof MeetingDossierSchema>;

export const CaptureRecapInputSchema = z.object({
  dossier_id: z.string().uuid().nullable().default(null),
  title: z.string().min(1),
  notes: z.string().default(""),
});
export type CaptureRecapInput = z.infer<typeof CaptureRecapInputSchema>;

/** The post-meeting recap. Append-only — one per meeting. */
export const MeetingRecapSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  dossier_id: z.string().uuid().nullable().default(null),
  title: z.string().min(1),
  summary: z.string().default(""),
  commitments: z.array(z.string()).default([]),
  follow_ups: z.array(z.string()).default([]),
  relationship_updates: z.array(z.string()).default([]),
  next_actions: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type MeetingRecap = z.infer<typeof MeetingRecapSchema>;
