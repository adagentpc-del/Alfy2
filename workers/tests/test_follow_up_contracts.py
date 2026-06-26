"""Cross-runtime lockstep tests for the Follow-Up Execution Engine contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/follow-up.ts` (canonical). If a fixture fails here, the
model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import FollowUp, SequenceStep


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


def test_follow_up_fixture_validates() -> None:
    FollowUp.model_validate(_load("follow_up.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_sequence_step_constructs() -> None:
    step = SequenceStep.model_validate(
        {"day_offset": 0, "channel": "email", "template": "Hello"}
    )
    assert step.day_offset == 0


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_follow_up_rejects_invalid_entity_kind() -> None:
    payload = _load("follow_up.valid.json")
    payload["entity_kind"] = "rumor"
    with pytest.raises(ValidationError):
        FollowUp.model_validate(payload)


def test_follow_up_rejects_invalid_status() -> None:
    payload = _load("follow_up.valid.json")
    payload["status"] = "archived"
    with pytest.raises(ValidationError):
        FollowUp.model_validate(payload)


def test_follow_up_rejects_empty_sequence() -> None:
    payload = _load("follow_up.valid.json")
    payload["sequence"] = []
    with pytest.raises(ValidationError):
        FollowUp.model_validate(payload)
