import type { MeteredAi } from "@alfy2/core";
import type { JobSpec } from "../scheduler.js";

/**
 * The first working hands (docs/VISION_GAP_AUDIT.md critical-path step 3): every hour, pick up ONE
 * accepted delegation packet from the gateway, have the AI draft the deliverable, and report back
 * through /org/reports for HUMAN review — task_completed with approval_needed=true, always. The
 * runner never touches anything external (no sends, no deploys — those stay behind their gates);
 * it labors on drafts, exactly like a junior staffer who writes but never signs.
 * Credential-gated: without an AI layer the job succeeds as a labeled no-op.
 */
export interface PacketRunnerDeps {
  apiBase: string;
  token: string;
  ai: MeteredAi | undefined;
  fetchImpl?: typeof fetch;
}

export function makePacketRunnerJob(deps: PacketRunnerDeps): JobSpec {
  const doFetch = deps.fetchImpl ?? fetch;
  const headers = { Authorization: `Bearer ${deps.token}`, "content-type": "application/json" };
  return {
    name: "packet-runner",
    cadence: "hourly",
    maxRetries: 2,
    run: async () => {
      if (!deps.ai) return { ok: true, detail: "skipped — ai layer not configured (set AI_PROVIDER_API_KEY)" };
      const listRes = await doFetch(`${deps.apiBase}/org/packets`, { headers });
      if (!listRes.ok) return { ok: false, detail: `packets list HTTP ${listRes.status}` };
      const { packets = [] } = (await listRes.json()) as { packets?: Array<Record<string, unknown>> };
      const accepted = packets.find((p) => p.status === "accepted");
      if (!accepted) return { ok: true, detail: "no accepted packets waiting" };

      const objective = String(accepted.objective ?? "");
      const result = await deps.ai.complete({
        kind: "draft_report",
        system:
          "You are an AI employee at Divini Group executing ONE delegation packet. Produce the deliverable as a concrete draft. Respect the packet's prohibited actions absolutely. You draft; a human reviews and approves. Never claim external actions were taken.",
        prompt: `Objective: ${objective}\nBusiness: ${String(accepted.business ?? "—")}\nRequired output: ${String(accepted.required_output ?? "a concrete draft")}\nContext: ${JSON.stringify(accepted.context_stack ?? [])}\nProhibited: ${JSON.stringify(accepted.prohibited_actions ?? [])}\n\nProduce the deliverable now.`,
        max_tokens: 2000,
        model: "claude-sonnet-5",
      });

      const reportRes = await doFetch(`${deps.apiBase}/org/reports`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          packet_id: accepted.id,
          agent: String(accepted.assigned_agent ?? "ai-runner"),
          task_completed: true,
          output_produced: result.text,
          confidence: 0.6,
          approval_needed: true, // the runner's work NEVER self-approves
          recommended_next_step: "Human review of this AI-drafted deliverable, then approve/revise.",
          execution_status: "completed",
        }),
      });
      if (!reportRes.ok) return { ok: false, detail: `report submit HTTP ${reportRes.status}` };
      return { ok: true, detail: `packet ${String(accepted.id)} drafted (${result.usage.output_tokens} tokens, ${result.usage.cost_cents.toFixed(3)}¢) and reported for review` };
    },
  };
}
