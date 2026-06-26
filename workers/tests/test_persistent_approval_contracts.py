"""Cross-runtime lockstep tests for the Persistent Approval contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/persistent-approval.ts` (which is canonical); if a fixture
fails here, the model is wrong, not the fixture. Negative tests assert that constraints
mirrored from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    ApprovalLimits,
    ApprovalScope,
    CreatePersistentApprovalInput,
    PersistentApproval,
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


def test_persistent_approval_fixture_validates() -> None:
    PersistentApproval.model_validate(_load("persistent_approval.valid.json"))


def test_create_persistent_approval_input_fixture_validates() -> None:
    CreatePersistentApprovalInput.model_validate(
        _load("create_persistent_approval_input.valid.json")
    )


# --- Positive tests: inline-constructed models (no fixture) must validate ---


def test_approval_scope_constructs() -> None:
    ApprovalScope.model_validate(
        {
            "action_class": "spend_money",
            "action_pattern": "ad spend",
            "business_id": None,
            "goal_id": None,
            "environments": ["dev"],
        }
    )


def test_approval_limits_constructs() -> None:
    ApprovalLimits.model_validate(
        {
            "max_uses": 5,
            "used_count": 1,
            "max_amount_usd": 250.0,
        }
    )


def test_approval_scope_defaults_environments() -> None:
    scope = ApprovalScope()
    assert scope.environments == ["dev", "staging"]


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_persistent_approval_rejects_invalid_grant_type() -> None:
    payload = _load("persistent_approval.valid.json")
    payload["grant_type"] = "maybe"
    with pytest.raises(ValidationError):
        PersistentApproval.model_validate(payload)


def test_persistent_approval_rejects_invalid_status() -> None:
    payload = _load("persistent_approval.valid.json")
    payload["status"] = "pending"
    with pytest.raises(ValidationError):
        PersistentApproval.model_validate(payload)


def test_approval_limits_rejects_zero_max_uses() -> None:
    with pytest.raises(ValidationError):
        ApprovalLimits.model_validate({"max_uses": 0})


def test_approval_limits_rejects_negative_max_amount() -> None:
    with pytest.raises(ValidationError):
        ApprovalLimits.model_validate({"max_amount_usd": -5})
