"""Cross-runtime lockstep tests for the Consequence Horizon Engine contracts.

Mirrors `packages/shared/src/contracts/consequence-horizon.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ConsequenceProjection, ProjectConsequencesInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_consequence_projection_fixture_validates() -> None:
    payload = _load("consequence_projection.valid.json")
    model = ConsequenceProjection.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.decision == payload["decision"]
    assert len(model.horizons) == len(payload["horizons"])


def test_project_consequences_input_constructs() -> None:
    payload = ProjectConsequencesInput.model_validate({"decision": "Partner with X"})
    assert payload.immediate_value == 0.5
    assert payload.doors == []


def test_consequence_projection_rejects_invalid_horizon() -> None:
    payload = _load("consequence_projection.valid.json")
    payload["horizons"][0]["horizon"] = "10_year"
    with pytest.raises(ValidationError):
        ConsequenceProjection.model_validate(payload)
