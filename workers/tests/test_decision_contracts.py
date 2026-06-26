"""Cross-runtime lockstep tests for the Decision Engine contracts.

For each canonical decision fixture in `packages/shared/fixtures/`, load the JSON and
construct the matching Pydantic model. These models mirror the Zod schemas in
`packages/shared/src/contracts/decision.ts` (which are canonical); if a fixture fails here,
the model is wrong, not the fixture. Negative tests assert that constraints mirrored from
Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    Decision,
    DecisionInput,
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


def test_decision_input_fixture_validates() -> None:
    DecisionInput.model_validate(_load("decision_input.valid.json"))


def test_decision_fixture_validates() -> None:
    Decision.model_validate(_load("decision.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_decision_rejects_urgency_above_one() -> None:
    data = _load("decision.valid.json")
    data["urgency"] = 1.5
    with pytest.raises(ValidationError):
        Decision.model_validate(data)


def test_decision_rejects_invalid_primary_category() -> None:
    data = _load("decision.valid.json")
    data["primary_category"] = "spaceship"
    with pytest.raises(ValidationError):
        Decision.model_validate(data)


def test_decision_rejects_empty_categories() -> None:
    data = _load("decision.valid.json")
    data["categories"] = []
    with pytest.raises(ValidationError):
        Decision.model_validate(data)
