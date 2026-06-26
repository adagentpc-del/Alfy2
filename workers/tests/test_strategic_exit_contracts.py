"""Cross-runtime lockstep tests for the Strategic Exit & Asset Value Engine contracts.

Mirrors `packages/shared/src/contracts/strategic-exit.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AssessExitInput, ExitAssessment


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_exit_assessment_fixture_validates() -> None:
    payload = _load("exit_assessment.valid.json")
    model = ExitAssessment.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.asset_name == payload["asset_name"]


def test_assess_exit_input_constructs() -> None:
    payload = AssessExitInput.model_validate({"asset_name": "Newsletter"})
    assert payload.documentation == 0.3
    assert payload.business_id is None


def test_exit_assessment_rejects_invalid_path() -> None:
    payload = _load("exit_assessment.valid.json")
    payload["recommended_paths"] = ["moon_shot"]
    with pytest.raises(ValidationError):
        ExitAssessment.model_validate(payload)
