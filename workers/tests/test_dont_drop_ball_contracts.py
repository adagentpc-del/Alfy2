"""Cross-runtime lockstep tests for the Don't Drop the Ball contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/dont-drop-ball.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import BallCandidate, DroppedItem


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


def test_dropped_item_fixture_validates() -> None:
    DroppedItem.model_validate(_load("dropped_item.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_ball_candidate_constructs() -> None:
    candidate = BallCandidate.model_validate(
        {
            "kind": "forgotten_lead",
            "title": "Lead from webinar never contacted",
            "last_activity_at": "2026-06-01T12:00:00.000Z",
        }
    )
    assert candidate.business_id is None
    assert candidate.business_name == ""
    assert candidate.value_usd == 0


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_dropped_item_rejects_invalid_kind() -> None:
    payload = _load("dropped_item.valid.json")
    payload["kind"] = "lost_sock"
    with pytest.raises(ValidationError):
        DroppedItem.model_validate(payload)


def test_dropped_item_rejects_invalid_status() -> None:
    payload = _load("dropped_item.valid.json")
    payload["status"] = "forgotten"
    with pytest.raises(ValidationError):
        DroppedItem.model_validate(payload)


def test_dropped_item_rejects_negative_age_days() -> None:
    payload = _load("dropped_item.valid.json")
    payload["age_days"] = -1
    with pytest.raises(ValidationError):
        DroppedItem.model_validate(payload)
