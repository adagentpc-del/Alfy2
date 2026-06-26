import type { ModelDescriptor } from "@alfy2/shared";

/**
 * Default model catalog — seed data, not hard-coded logic. Adding a current or FUTURE model is a
 * matter of appending a descriptor (or calling `router.register()`), with no code change. Capability
 * scores are 0..1 per task type and drive routing. See docs/MODEL_ROUTER.md.
 */
export const DEFAULT_MODEL_CATALOG: ModelDescriptor[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    provider: "anthropic",
    local: false,
    available: true,
    cost_tier: "medium",
    context_window: 200000,
    strengths: { coding: 0.95, reasoning: 0.9, writing: 0.85, debugging: 0.95, planning: 0.9, research: 0.8, architecture: 0.92, summarization: 0.85 },
    notes: "Strong all-rounder; excels at coding, debugging, and architecture.",
  },
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    provider: "openai",
    local: false,
    available: true,
    cost_tier: "high",
    context_window: 256000,
    strengths: { coding: 0.9, reasoning: 0.95, writing: 0.9, debugging: 0.88, planning: 0.9, research: 0.9, architecture: 0.9, summarization: 0.9 },
    notes: "Top-tier reasoning, writing, and research.",
  },
  {
    id: "gpt-codex",
    name: "GPT Codex",
    provider: "openai",
    local: false,
    available: true,
    cost_tier: "medium",
    context_window: 128000,
    strengths: { coding: 0.97, reasoning: 0.8, writing: 0.6, debugging: 0.93, planning: 0.7, research: 0.6, architecture: 0.8, summarization: 0.6 },
    notes: "Code specialist — best raw coding and debugging.",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    provider: "openclaw",
    local: false,
    available: true,
    cost_tier: "low",
    context_window: 128000,
    strengths: { coding: 0.8, reasoning: 0.82, writing: 0.8, debugging: 0.78, planning: 0.8, research: 0.85, architecture: 0.78, summarization: 0.82 },
    notes: "Balanced and cost-effective; good research.",
  },
  {
    id: "local-llama",
    name: "Local model",
    provider: "local",
    local: true,
    available: true,
    cost_tier: "low",
    context_window: 32000,
    strengths: { coding: 0.65, reasoning: 0.6, writing: 0.7, debugging: 0.6, planning: 0.6, research: 0.55, architecture: 0.55, summarization: 0.75 },
    notes: "Runs locally — cheapest and private; lower ceiling.",
  },
];
