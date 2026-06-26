"""Cross-runtime lockstep tests for the Anti-Fragility Engine contracts.

Mirrors `packages/shared/src/contracts/anti-fragility.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AnalyzeFailureInput, AntiFragilityCase


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_anti_fragility_case_fixture_validates() -> None:
    payload = _load("anti_fragility_case.valid.json")
    model = AntiFragilityCase.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.type == payload["type"]


def test_analyze_failure_input_constructs() -> None:
    payload = AnalyzeFailureInput.model_validate({"type": "lost_sale", "title": "Lost Acme"})
    assert payload.detail == ""
    assert payload.preventable is True


def test_anti_fragility_case_rejects_out_of_range_learning() -> None:
    payload = _load("anti_fragility_case.valid.json")
    payload["learning_gained"] = 1.5
    with pytest.raises(ValidationError):
        AntiFragilityCase.model_validate(payload)
