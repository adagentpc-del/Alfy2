"""Cross-runtime lockstep tests for the Enterprise Security contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/security.ts` (which is canonical); if a fixture fails here,
the model is wrong, not the fixture. Negative tests assert that constraints mirrored from
Zod actually reject invalid payloads — including the vault-never-stores-value guarantee
(`value_stored` is the literal `False`).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    ActionRequest,
    ApprovalRequest,
    AuditEntry,
    PermissionGroup,
    SecretRef,
    SecurityDecision,
    Session,
)


def _repo_root() -> Path:
    """Walk up from this test file until we find the repo root (has packages/shared/fixtures)."""
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- Positive tests: shared fixtures must validate against the mirrored models ---


def test_action_request_fixture_validates() -> None:
    ActionRequest.model_validate(_load("action_request.valid.json"))


def test_security_decision_fixture_validates() -> None:
    SecurityDecision.model_validate(_load("security_decision.valid.json"))


def test_audit_entry_fixture_validates() -> None:
    AuditEntry.model_validate(_load("audit_entry.valid.json"))


def test_secret_ref_fixture_validates() -> None:
    SecretRef.model_validate(_load("secret_ref.valid.json"))


def test_session_fixture_validates() -> None:
    Session.model_validate(_load("session.valid.json"))


# --- Positive tests: inline-constructed models (no fixture) must validate ---


def test_permission_group_constructs() -> None:
    PermissionGroup.model_validate(
        {
            "id": "80808080-6666-4fff-8fff-808080808080",
            "tenant_id": "00000000-0000-0000-0000-000000000001",
            "name": "Finance approvers",
            "permissions": ["billing.manage", "approve.irreversible"],
            "members": ["adagentpc@gmail.com"],
            "created_at": "2026-06-24T12:00:00.000Z",
        }
    )


def test_approval_request_constructs() -> None:
    ApprovalRequest.model_validate(
        {
            "id": "90909090-7777-4aaa-8aaa-909090909090",
            "tenant_id": "00000000-0000-0000-0000-000000000001",
            "requested_by": "research.web",
            "action": "Pay the A3 Visual invoice",
            "action_class": "spend_money",
            "resource": "invoice:4471",
            "reason": "Spending money always requires explicit approval.",
            "status": "pending",
            "required_role": "owner",
            "created_at": "2026-06-24T12:00:00.000Z",
            "audit_id": "50505050-3333-4ccc-8ccc-505050505050",
        }
    )


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_secret_ref_rejects_value_stored_true() -> None:
    """The vault NEVER stores the secret value — value_stored is the literal False."""
    payload = _load("secret_ref.valid.json")
    payload["value_stored"] = True
    with pytest.raises(ValidationError):
        SecretRef.model_validate(payload)


def test_action_request_rejects_unknown_action_class() -> None:
    payload = _load("action_request.valid.json")
    payload["action_class"] = "launch_nukes"
    with pytest.raises(ValidationError):
        ActionRequest.model_validate(payload)


def test_security_decision_rejects_empty_reasons() -> None:
    payload = _load("security_decision.valid.json")
    payload["reasons"] = []
    with pytest.raises(ValidationError):
        SecurityDecision.model_validate(payload)


def test_secret_ref_rejects_zero_rotation_period() -> None:
    payload = _load("secret_ref.valid.json")
    payload["rotation_period_days"] = 0
    with pytest.raises(ValidationError):
        SecretRef.model_validate(payload)
