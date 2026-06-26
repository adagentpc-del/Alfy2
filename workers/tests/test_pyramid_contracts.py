"""Cross-runtime lockstep tests for The Alfy² Pyramid contracts.

Mirrors `packages/shared/src/contracts/pyramid.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ClassifyPyramidInput, PyramidPlacement


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_pyramid_placement_fixture_validates() -> None:
    payload = _load("pyramid_placement.valid.json")
    model = PyramidPlacement.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.current_level == payload["current_level"]
    assert model.how_to_advance == payload["how_to_advance"]


def test_classify_pyramid_input_constructs() -> None:
    payload = ClassifyPyramidInput.model_validate({"feature": "Inbox triage"})
    assert payload.captures == 0
    assert payload.creates_freedom == 0


def test_pyramid_placement_rejects_invalid_level() -> None:
    payload = _load("pyramid_placement.valid.json")
    payload["current_level"] = "ascend"
    with pytest.raises(ValidationError):
        PyramidPlacement.model_validate(payload)
