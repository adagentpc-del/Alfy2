import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateName, resolveComposition, buildCommand } from "./render.mjs";

const fixture = () => {
  const base = mkdtempSync(path.join(tmpdir(), "rt-"));
  mkdirSync(path.join(base, "compositions", "ok-1"), { recursive: true });
  writeFileSync(path.join(base, "compositions", "ok-1", "index.html"), "<html></html>");
  mkdirSync(path.join(base, "compositions", "empty"));
  return base;
};

test("accepts valid names", () => {
  for (const n of ["example", "a", "my-video-2"]) assert.equal(validateName(n), n);
});
test("rejects invalid names", () => {
  for (const n of ["", "..", "../x", "a/b", "A", "a_b", "a b", "a\0b", "-x/..", "x".repeat(65), undefined, null, 5])
    assert.throws(() => validateName(n), /Invalid composition name/, String(n));
});
test("resolves existing composition", () => {
  const base = fixture();
  assert.equal(resolveComposition("ok-1", base), path.join(base, "compositions", "ok-1"));
});
test("refuses missing composition and missing index.html", () => {
  const base = fixture();
  assert.throws(() => resolveComposition("nope", base), /not found/);
  assert.throws(() => resolveComposition("empty", base), /Missing index.html/);
});
test("refuses traversal and symlinks", () => {
  const base = fixture();
  assert.throws(() => resolveComposition("../..", base));
  symlinkSync(tmpdir(), path.join(base, "compositions", "link"));
  assert.throws(() => resolveComposition("link", base), /Symlink/);
});
test("command is pinned and uses no shell string", () => {
  const [cmd, args] = buildCommand("/d", "/o.mp4");
  assert.equal(cmd, "npx");
  assert.ok(args.some((a) => /^hyperframes@\d+\.\d+\.\d+$/.test(a)));
  assert.deepEqual(args.slice(-4), ["render", "/d", "--output", "/o.mp4"].slice(-4));
});
