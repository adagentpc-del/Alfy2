import type { SignalToAction } from "@alfy2/shared";
import { SignalToActionSchema } from "@alfy2/shared";

/**
 * Merges multiple agent SignalToAction results into a single explainable response
 * (ARCHITECTURE.md §4 step 5). Deterministic: confidences are averaged, evidence and next_actions
 * are concatenated, and explanations are joined so the rationale is never lost.
 */
export function assembleSignals(results: SignalToAction[]): SignalToAction {
  if (results.length === 0) {
    throw new Error("Cannot assemble an empty result set");
  }
  if (results.length === 1) {
    return results[0]!;
  }

  const merged: SignalToAction = {
    what_changed: results.map((r) => r.what_changed).join(" "),
    why_it_matters: results.map((r) => r.why_it_matters).join(" "),
    next_actions: results.flatMap((r) => r.next_actions),
    confidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
    evidence: results.flatMap((r) => r.evidence),
    explanation: results.map((r) => r.explanation).join("\n"),
  };
  // Re-validate the assembled envelope against the contract.
  return SignalToActionSchema.parse(merged);
}
