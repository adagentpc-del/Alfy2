"""Cross-runtime lockstep tests for the Conversion War Room contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/war-room.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import StartWarRoomTestInput, WarRoomTest


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- Positive: shared fixture must validate ---


def test_war_room_test_fixture_validates() -> None:
    WarRoomTest.model_validate(_load("war_room_test.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_start_war_room_test_input_constructs() -> None:
    payload = StartWarRoomTestInput.model_validate(
        {"surface": "landing_page", "label": "Hero headline test"}
    )
    assert payload.business_id is None
    assert payload.variant_a_label == "A"
    assert payload.variant_b_label == "B"


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_war_room_test_rejects_invalid_surface() -> None:
    payload = _load("war_room_test.valid.json")
    payload["surface"] = "billboard"
    with pytest.raises(ValidationError):
        WarRoomTest.model_validate(payload)


def test_war_room_test_rejects_invalid_winner() -> None:
    payload = _load("war_room_test.valid.json")
    payload["winner"] = "c"
    with pytest.raises(ValidationError):
        WarRoomTest.model_validate(payload)
