// Phase-0 stand-in for the full boot check (see docs/STARTUP_SEQUENCE.md §4).
// Validates that: (1) .env.example exists and is non-empty, (2) every module manifest.json
// parses and declares the required fields. No external/network calls.
// Replaced in Phase 1 by the real config-schema + registry validation.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`✓ ${msg}`);

// 1. .env.example present
const envExample = join(ROOT, ".env.example");
if (!existsSync(envExample) || statSync(envExample).size === 0) {
  fail(".env.example is missing or empty");
} else {
  ok(".env.example present");
}

// 2. Module manifests parse and declare required fields
const REQUIRED = ["id", "version", "capabilities", "requires_agents", "owner"];
const modulesDir = join(ROOT, "modules");
let manifestCount = 0;
if (existsSync(modulesDir)) {
  for (const entry of readdirSync(modulesDir)) {
    const manifestPath = join(modulesDir, entry, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    manifestCount++;
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const missing = REQUIRED.filter((k) => !(k in manifest));
      if (missing.length) {
        fail(`modules/${entry}/manifest.json missing fields: ${missing.join(", ")}`);
      } else {
        ok(`modules/${entry} manifest valid`);
      }
    } catch (err) {
      fail(`modules/${entry}/manifest.json does not parse: ${err.message}`);
    }
  }
}
if (manifestCount === 0) fail("no module manifests found under modules/");

if (process.exitCode === 1) {
  console.error("\ncheck FAILED");
} else {
  console.log("\ncheck OK");
}
