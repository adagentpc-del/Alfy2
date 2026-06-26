import type {
  RepoScanInput,
  SecurityFinding,
  SecurityCategory,
  FindingSeverity,
} from "@alfy2/shared";

/**
 * Static security detectors for the GitHub Intelligence System. They read provided file content and
 * dependency names with regex/keyword rules and report findings. NOTHING IS EXECUTED — no shell, no
 * eval, no network, no install. Detection is pattern-matching on text only. See docs/GITHUB_INTELLIGENCE.md.
 */

interface Rule {
  category: SecurityCategory;
  severity: FindingSeverity;
  pattern: RegExp;
  description: string;
}

const FILE_RULES: Rule[] = [
  // malicious scripts
  { category: "malicious_script", severity: "critical", pattern: /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(ba)?sh\b/i, description: "Pipes a downloaded script straight into a shell." },
  { category: "malicious_script", severity: "high", pattern: /\brm\s+-rf\s+(\/|~|\$HOME)\b/i, description: "Destructive recursive delete of a root/home path." },
  { category: "malicious_script", severity: "high", pattern: /\b(child_process|subprocess|os)\.(exec|system|popen|spawn)\s*\(/i, description: "Spawns a shell/process — review intent." },
  // credential harvesting
  { category: "credential_harvesting", severity: "critical", pattern: /(process\.env|os\.environ)[^\n]{0,120}(fetch|axios|requests\.post|https?:\/\/)|(fetch|axios|requests\.post|https?:\/\/)[^\n]{0,120}(process\.env|os\.environ)/i, description: "Reads environment secrets and sends them over the network." },
  { category: "credential_harvesting", severity: "high", pattern: /(\.ssh\/id_rsa|\.aws\/credentials|\.npmrc|_token|secret_key|private[_-]?key)/i, description: "References credential files or secret material." },
  { category: "credential_harvesting", severity: "medium", pattern: /localStorage\.(getItem|removeItem)\([^)]*token/i, description: "Touches auth tokens in browser storage." },
  // obfuscated code
  { category: "obfuscated_code", severity: "high", pattern: /eval\s*\(\s*(atob|Buffer\.from|decode|unescape)\s*\(/i, description: "Evaluates decoded/obfuscated content at runtime." },
  { category: "obfuscated_code", severity: "medium", pattern: /(\\x[0-9a-f]{2}){8,}|String\.fromCharCode\((?:\d+,\s*){10,}/i, description: "Long hex/char-code sequences suggest obfuscation." },
  // network abuse
  { category: "network_abuse", severity: "high", pattern: /stratum\+tcp:\/\//i, description: "Stratum mining-pool protocol." },
  { category: "network_abuse", severity: "medium", pattern: /\bnew\s+WebSocket\(|net\.connect\(|\bconnect\(\s*\d{2,5}\s*,/i, description: "Opens raw network connections." },
  // crypto mining
  { category: "crypto_mining", severity: "critical", pattern: /\b(coinhive|cryptonight|xmrig|minerd|minergate|hashrate|webminer)\b/i, description: "Cryptocurrency miner signatures." },
  // unsafe permissions
  { category: "unsafe_permissions", severity: "high", pattern: /\bchmod\s+(-R\s+)?0?777\b|\bUSER\s+root\b/i, description: "World-writable permissions or running as root." },
  { category: "unsafe_permissions", severity: "medium", pattern: /permissions:\s*write-all|pull_request_target/i, description: "Broad CI permissions / risky workflow trigger." },
];

/** Dependency-name signals (suspicious packages + obvious miner/keylogger names). */
const SUSPICIOUS_DEP = /(coinhive|cryptonight|xmrig|miner|keylog|stealer|exfil|payload|backdoor)/i;
/** Demo set of dependencies treated as known-vulnerable (replace with a real advisory feed later). */
const KNOWN_VULNERABLE = new Set(["event-stream@3.3.6", "left-pad@0.0.3", "ua-parser-js@0.7.29"]);

function firstMatchSnippet(content: string, re: RegExp): string {
  const m = re.exec(content);
  if (!m) return "";
  const idx = Math.max(0, m.index - 20);
  return content.slice(idx, m.index + m[0].length + 20).replace(/\s+/g, " ").trim();
}

export function scanForFindings(input: RepoScanInput): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const file of input.files) {
    for (const rule of FILE_RULES) {
      if (rule.pattern.test(file.content)) {
        findings.push({
          category: rule.category,
          severity: rule.severity,
          evidence: `${file.path}: ${firstMatchSnippet(file.content, rule.pattern) || "(matched)"}`,
          description: rule.description,
        });
      }
    }
  }

  for (const dep of input.dependencies) {
    if (SUSPICIOUS_DEP.test(dep)) {
      findings.push({
        category: "suspicious_dependency",
        severity: "high",
        evidence: `dependency: ${dep}`,
        description: "Dependency name matches a known-bad / miner / exfiltration signature.",
      });
    }
    if (KNOWN_VULNERABLE.has(dep)) {
      findings.push({
        category: "package_vulnerability",
        severity: "high",
        evidence: `dependency: ${dep}`,
        description: "Dependency version is on the known-vulnerable list.",
      });
    }
    if (!/[@~^>=<\d]/.test(dep) && dep.length > 0 && !dep.includes("/")) {
      // unpinned dependency (no version) — low-severity hygiene flag
      findings.push({
        category: "package_vulnerability",
        severity: "low",
        evidence: `dependency: ${dep}`,
        description: "Dependency is unpinned (no version) — supply-chain hygiene risk.",
      });
    }
  }

  return findings;
}
