/**
 * Connections layer smoke. Verifies the Set up & Connect surface:
 * register platforms at runtime, connect at master/business/personal scopes, business→master resolution,
 * pending-setup until secrets attach, and adding a brand-new platform on the fly. Run: pnpm connections:smoke
 */
import assert from "node:assert/strict";
import { ConnectionsHub, UnknownConnectorError } from "@alfy2/core";

const T = "00000000-0000-0000-0000-0000000000ee";
const MOVE_MI = "00000000-0000-0000-0000-0000000000a1";
const STRATA = "00000000-0000-0000-0000-0000000000b2";
let n = 0;
const idFactory = () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`;

const hub = new ConnectionsHub({ idFactory });

// Connecting before registering the platform is refused.
assert.throws(() => hub.connect(T, { scope: "master", business_id: null, provider: "resend", label: "", granted_scopes: [] }), UnknownConnectorError);

// 1. Register email (needs a secret) and post a master default.
hub.registerConnector(T, { provider: "resend", display_name: "Resend", category: "email", auth_kind: "api_key", required_secret_keys: ["RESEND_API_KEY"], default_scopes: ["send"], risk_level: "medium", docs_url: "" });
const master = hub.connect(T, { scope: "master", business_id: null, provider: "resend", label: "Master email", granted_scopes: [] });
assert.equal(master.status, "pending_setup"); // needs the secret
assert.deepEqual(hub.missingSecretKeys(T, master.id), ["RESEND_API_KEY"]);
hub.attachSecrets(T, master.id, ["vault://resend/master"]);
assert.equal(hub.get(T, master.id)?.status, "connected");

// 2. Move Mi has no email of its own → inherits the master.
let res = hub.resolve(T, { provider: "resend", business_id: MOVE_MI });
assert.equal(res.resolved_from, "master");
assert.equal(res.can_use, true);

// 3. StrataLogic connects its OWN email → overrides the master.
const strata = hub.connect(T, { scope: "business", business_id: STRATA, provider: "resend", label: "StrataLogic email", granted_scopes: [] });
hub.attachSecrets(T, strata.id, ["vault://resend/strata"]);
res = hub.resolve(T, { provider: "resend", business_id: STRATA });
assert.equal(res.resolved_from, "business");
assert.equal(res.connection_id, strata.id);

// 4. A provider with no master and no business connection → none / needs setup.
const none = hub.resolve(T, { provider: "instagram", business_id: MOVE_MI });
assert.equal(none.resolved_from, "none");
assert.equal(none.can_use, false);

// 5. A BRAND-NEW platform added on the fly (no code change) — personal scope.
hub.registerConnector(T, { provider: "bluesky", display_name: "Bluesky", category: "social", auth_kind: "oauth2", required_secret_keys: [], default_scopes: ["post"], risk_level: "low", docs_url: "" });
const personal = hub.connect(T, { scope: "personal", business_id: null, provider: "bluesky", label: "My Bluesky", granted_scopes: [] });
assert.equal(personal.status, "connected"); // oauth2 with no required secret keys here
assert.equal(hub.listPersonal(T).length, 1);
assert.equal(hub.listForBusiness(T, STRATA).length, 1);
assert.equal(hub.listMaster(T).length, 1);
assert.ok(hub.listConnectors(T).some((c) => c.provider === "bluesky"));

console.log("✓ connections smoke passed (register/connect/scope/resolve/inherit/new-platform)");
