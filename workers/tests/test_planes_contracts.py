"""Cross-runtime lockstep tests for the Control/Execution Planes contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/planes.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ExecutionRequest, PlaneAssignment, PlaneDecision


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


def test_plane_decision_fixture_validates() -> None:
    PlaneDecision.model_validate(_load("plane_decision.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_execution_request_constructs() -> None:
    payload = ExecutionRequest.model_validate(
        {"capability": "send campaign", "concern": "campaigns"}
    )
    assert payload.approved is None
    assert payload.identity_verified is False


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_execution_request_rejects_invalid_concern() -> None:
    with pytest.raises(ValidationError):
        ExecutionRequest.model_validate(
            {"capability": "mine crypto", "concern": "mining"}
        )


def test_plane_assignment_rejects_invalid_plane() -> None:
    with pytest.raises(ValidationError):
        PlaneAssignment.model_validate(
            {"capability": "store records", "plane": "data", "concern": "storage"}
        )
