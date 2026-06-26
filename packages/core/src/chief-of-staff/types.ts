import type { MemoryQuery, MemoryRecord, BriefingHorizon, DecisionInput } from "@alfy2/shared";

/**
 * Inputs and ports for the Chief of Staff. It reads (decisions + memory) and synthesizes a briefing;
 * it holds NO dispatcher, no AI gateway, no write access — it cannot execute work, only coordinate it.
 */

/** A meeting the operator has coming up. No calendar service is connected; meetings are passed in. */
export interface MeetingInput {
  title: string;
  /** ISO datetime, or null/undefined if unscheduled. */
  when?: string | null;
  attendees?: string[];
}

/** What the Chief of Staff is asked to brief on. */
export interface BriefInput {
  /** The raw inbox/tasks/signals to triage (each gets classified + scored by the Decision Engine). */
  items: DecisionInput[];
  /** Optional upcoming meetings for calendar/meeting prep. */
  meetings?: MeetingInput[];
  horizon?: BriefingHorizon;
}

/** Read-only memory port. Satisfied by MemoryEngine.peek (which does NOT reinforce/mutate). */
export interface MemoryReader {
  peek(
    tenantId: string,
    query: MemoryQuery,
  ): Promise<Array<{ memory: MemoryRecord; score: number }>>;
}
