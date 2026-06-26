/**
 * Tiny deterministic text-signal helpers shared by the Decision classifier and scorers.
 * Substring matching on a lowercased blob keeps everything explainable and dependency-free.
 */

/** Build the searchable blob from input text + stringified context values. */
export function buildBlob(text: string, context: Record<string, unknown>): string {
  const ctx = Object.values(context)
    .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : ""))
    .join(" ");
  return `${text} ${ctx}`.toLowerCase();
}

/** Return the subset of `terms` that appear in `blob` (as substrings). */
export function matchedTerms(blob: string, terms: string[]): string[] {
  return terms.filter((t) => blob.includes(t));
}

export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
