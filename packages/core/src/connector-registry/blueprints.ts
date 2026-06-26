import type { AuthMethod, RiskSeverity } from "@alfy2/shared";

/**
 * Connector blueprints — convenience seed data, NOT hard-coded integrations. A blueprint is a template
 * the registry can `install()` per tenant. Future connectors can either add a blueprint here (data) or
 * be registered directly as a full descriptor (no blueprint needed). The generic `mcp` blueprint
 * covers arbitrary future MCP connectors. See docs/CONNECTOR_REGISTRY.md.
 */

export interface ConnectorBlueprint {
  kind: string;
  name: string;
  category: string;
  authentication: AuthMethod;
  permissions: string[];
  risk_level: RiskSeverity;
  allowed_actions: string[];
}

export const CONNECTOR_BLUEPRINTS: Record<string, ConnectorBlueprint> = {
  github: { kind: "github", name: "GitHub", category: "dev", authentication: "oauth2", permissions: ["repo", "read:org"], risk_level: "medium", allowed_actions: ["read_repo", "create_issue", "open_pull_request"] },
  gmail: { kind: "gmail", name: "Gmail", category: "email", authentication: "oauth2", permissions: ["gmail.readonly", "gmail.send"], risk_level: "high", allowed_actions: ["read_email", "send_email", "label"] },
  calendar: { kind: "calendar", name: "Google Calendar", category: "calendar", authentication: "oauth2", permissions: ["calendar.events"], risk_level: "medium", allowed_actions: ["read_events", "create_event", "update_event"] },
  google_drive: { kind: "google_drive", name: "Google Drive", category: "storage", authentication: "oauth2", permissions: ["drive.readonly", "drive.file"], risk_level: "high", allowed_actions: ["read_file", "upload_file", "search"] },
  slack: { kind: "slack", name: "Slack", category: "chat", authentication: "oauth2", permissions: ["channels:read", "chat:write"], risk_level: "medium", allowed_actions: ["read_channel", "send_message"] },
  discord: { kind: "discord", name: "Discord", category: "chat", authentication: "token", permissions: ["bot", "messages.read"], risk_level: "medium", allowed_actions: ["read_messages", "send_message"] },
  stripe: { kind: "stripe", name: "Stripe", category: "payments", authentication: "api_key", permissions: ["charges:read", "invoices:write"], risk_level: "high", allowed_actions: ["read_charges", "create_invoice", "issue_refund"] },
  supabase: { kind: "supabase", name: "Supabase", category: "db", authentication: "api_key", permissions: ["service_role"], risk_level: "high", allowed_actions: ["read_rows", "write_rows", "run_sql"] },
  notion: { kind: "notion", name: "Notion", category: "docs", authentication: "oauth2", permissions: ["read_content", "update_content"], risk_level: "medium", allowed_actions: ["read_page", "create_page", "update_page"] },
  crm: { kind: "crm", name: "CRM", category: "crm", authentication: "api_key", permissions: ["contacts.read", "deals.write"], risk_level: "medium", allowed_actions: ["read_contacts", "update_deal", "log_activity"] },
  mcp: { kind: "mcp", name: "MCP connector", category: "mcp", authentication: "mcp", permissions: [], risk_level: "medium", allowed_actions: [] },
};
