const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True if `v` is a syntactically valid UUID. Used to reject bad ids with 400 instead of a DB 500. */
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
