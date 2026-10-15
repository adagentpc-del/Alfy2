#!/usr/bin/env node
// Zero-dependency wrapper: validates a composition name, then runs the hyperframes CLI.
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const NAME_RE = /^[a-z0-9-]+$/;
// Version read from the cloned repo's packages/cli/package.json; confirm it exists on npm.
export const HYPERFRAMES_VERSION = "0.8.159";
const here = path.dirname(fileURLToPath(import.meta.url));

export function validateName(name) {
  if (typeof name !== "string" || name.length === 0 || name.length > 64 || !NAME_RE.test(name)) {
    throw new Error(`Invalid composition name: must match ${NAME_RE} (max 64 chars)`);
  }
  return name;
}

// Returns the absolute composition dir; throws on traversal, symlinks, or a missing index.html.
export function resolveComposition(name, baseDir = here) {
  validateName(name);
  const root = path.resolve(baseDir, "compositions");
  const dir = path.resolve(root, name);
  if (path.dirname(dir) !== root) throw new Error("Path traversal refused");
  if (!existsSync(dir)) throw new Error(`Composition not found: ${name}`);
  if (lstatSync(dir).isSymbolicLink()) throw new Error("Symlinked composition refused");
  const real = realpathSync(dir);
  if (path.dirname(real) !== realpathSync(root)) throw new Error("Path traversal refused");
  if (!existsSync(path.join(dir, "index.html"))) throw new Error(`Missing index.html in ${name}`);
  return dir;
}

export function buildCommand(dir, outFile) {
  return ["npx", ["--yes", `hyperframes@${HYPERFRAMES_VERSION}`, "render", dir, "--output", outFile]];
}

export function main(argv = process.argv.slice(2), baseDir = here) {
  if (argv.length !== 1) throw new Error("Usage: node render/render.mjs <composition>");
  const dir = resolveComposition(argv[0], baseDir);
  const outDir = path.resolve(baseDir, "out");
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${argv[0]}.mp4`);
  const [cmd, args] = buildCommand(dir, outFile);
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`hyperframes render failed (exit ${r.status ?? r.signal})`);
  console.log(`Wrote ${outFile}`);
  return outFile;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (e) { console.error(`error: ${e.message}`); process.exit(1); }
}
