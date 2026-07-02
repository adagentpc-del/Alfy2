import { Hono } from "hono";
import type { AppDeps, AppEnv } from "../types.js";

/**
 * AI routes (auth + tenant; internal_action — not approval-gated: these produce DRAFTS and
 * suggestions only, never external effects). The whole surface is credential-gated: without
 * AI_PROVIDER_API_KEY, deps.ai is undefined and every route answers 503 ai_not_configured —
 * the documented "plug the key in later" seam (docs/CREDENTIALS_NEEDED.md).
 */
export function aiRoutes(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  const notConfigured = { error: "ai_not_configured", hint: "set AI_PROVIDER_API_KEY in the service env" };

  // POST /ai/triage — classify one inbox-style item: category, urgency, business hint, next action.
  app.post("/ai/triage", async (c) => {
    if (!deps.ai) return c.json(notConfigured, 503);
    let body: { title?: unknown; content?: unknown };
    try { body = (await c.req.json()) as Record<string, unknown>; } catch { return c.json({ error: "invalid_json" }, 400); }
    const content = typeof body.content === "string" ? body.content : "";
    if (content.length < 3) return c.json({ error: "content required" }, 400);
    const result = await deps.ai.complete({
      kind: "triage",
      system: "You triage items for a holding-company operator. Reply with STRICT JSON only: {\"category\":\"revenue|operations|finance|legal|media|personal|other\",\"urgency\":\"now|this_week|scheduled|ignore\",\"business_hint\":\"<company key or empty>\",\"suggested_action\":\"<one sentence>\"}.",
      prompt: `Title: ${typeof body.title === "string" ? body.title : "(none)"}\n\n${content.slice(0, 4000)}`,
      max_tokens: 300,
      model: "claude-sonnet-5",
    });
    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(result.text.replace(/^```(?:json)?|```$/g, "").trim()) as Record<string, unknown>; } catch { /* raw fallback below */ }
    return c.json({ triage: parsed ?? { raw: result.text }, usage: result.usage }, 200);
  });

  // POST /ai/enrich — expand/refine a packet section draft. Drafts only; approvals stay human.
  app.post("/ai/enrich", async (c) => {
    if (!deps.ai) return c.json(notConfigured, 503);
    let body: { objective?: unknown; draft?: unknown; instructions?: unknown };
    try { body = (await c.req.json()) as Record<string, unknown>; } catch { return c.json({ error: "invalid_json" }, 400); }
    const draft = typeof body.draft === "string" ? body.draft : "";
    if (draft.length < 3) return c.json({ error: "draft required" }, 400);
    const result = await deps.ai.complete({
      kind: "enrich",
      system: "You refine business planning drafts for Divini Group. Keep the author's structure, replace TO-ANSWER prompts with your best concrete proposal marked (PROPOSED), never invent facts about real customers or finances, keep it tight.",
      prompt: `Objective: ${typeof body.objective === "string" ? body.objective : "improve this draft"}\n${typeof body.instructions === "string" ? `Instructions: ${body.instructions}\n` : ""}\n---\n${draft.slice(0, 8000)}`,
      max_tokens: 1500,
      model: "claude-sonnet-5",
    });
    return c.json({ text: result.text, usage: result.usage }, 200);
  });

  // GET /ai/status — is the intelligence layer configured, and what has it spent today?
  app.get("/ai/status", (c) =>
    c.json(deps.ai ? { configured: true, spent_today_cents: deps.ai.spentTodayCents() } : { configured: false }, 200));

  return app;
}
