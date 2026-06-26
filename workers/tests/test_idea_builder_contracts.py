"""Cross-runtime lockstep tests for the Idea Builder contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/idea-builder.ts` (which are canonical); if a fixture fails
here, the model is wrong, not the fixture. Negative tests assert that constraints
mirrored from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    IdeaBlueprint,
    IdeaInput,
    Recommendation,
    Risk,
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


def test_idea_input_fixture_validates() -> None:
    IdeaInput.model_validate(_load("idea_input.valid.json"))


def test_idea_blueprint_fixture_validates() -> None:
    IdeaBlueprint.model_validate(_load("idea_blueprint.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_recommendation_rejects_confidence_above_one() -> None:
    with pytest.raises(ValidationError):
        Recommendation.model_validate(
            {
                "verdict": "pursue",
                "confidence": 2.0,
                "rationale": "too confident",
                "next_step": "ship it",
            }
        )


def test_risk_rejects_invalid_severity() -> None:
    with pytest.raises(ValidationError):
        Risk.model_validate(
            {
                "risk": "the sky may fall",
                "severity": "apocalyptic",
                "mitigation": "build a bunker",
            }
        )


def test_idea_blueprint_rejects_missing_mvp() -> None:
    data = _load("idea_blueprint.valid.json")
    data.pop("mvp", None)
    with pytest.raises(ValidationError):
        IdeaBlueprint.model_validate(data)
