"""Cross-runtime lockstep tests for the Agent Identity & Zero Trust contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/agent-identity.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    AgentAccessRequest,
    AgentCapabilities,
    AgentIdentity,
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


# --- Positive: shared fixture must validate ---


def test_agent_identity_fixture_validates() -> None:
    AgentIdentity.model_validate(_load("agent_identity.valid.json"))


# --- Positive: secure defaults ---


def test_agent_capabilities_default_read_only() -> None:
    caps = AgentCapabilities()
    assert caps.can_write is False
    assert caps.can_spend is False
    assert caps.can_external_comm is False
    assert caps.can_modify_production is False
    assert caps.can_delete is False


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_agent_identity_rejects_invalid_status() -> None:
    payload = _load("agent_identity.valid.json")
    payload["status"] = "banned"
    with pytest.raises(ValidationError):
        AgentIdentity.model_validate(payload)


def test_agent_access_request_rejects_invalid_action() -> None:
    with pytest.raises(ValidationError):
        AgentAccessRequest.model_validate({"agent_key": "sales.outreach", "action": "teleport"})


def test_agent_access_request_rejects_negative_amount() -> None:
    with pytest.raises(ValidationError):
        AgentAccessRequest.model_validate(
            {"agent_key": "sales.outreach", "action": "spend", "amount_usd": -5}
        )
