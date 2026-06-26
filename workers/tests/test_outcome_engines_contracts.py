"""Cross-runtime lockstep tests for the Outcome engines (Relaxation + True Progress) contracts.

Mirrors `packages/shared/src/contracts/outcome-engines.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    AssessProgressInput,
    ProgressAssessment,
    RelaxationPlan,
    RelaxPlanInput,
)


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_relaxation_plan_fixture_validates() -> None:
    payload = _load("relaxation_plan.valid.json")
    model = RelaxationPlan.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert len(model.items) == len(payload["items"])


def test_progress_assessment_fixture_validates() -> None:
    payload = _load("progress_assessment.valid.json")
    model = ProgressAssessment.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.kind == payload["kind"]
    assert model.recommended_action == payload["recommended_action"]


def test_relax_plan_input_constructs() -> None:
    payload = RelaxPlanInput.model_validate({"items": [{"title": "Approve invoice"}]})
    assert payload.items[0].requires_alyssa == 0.5
    assert payload.items[0].approval_only is False


def test_assess_progress_input_constructs() -> None:
    payload = AssessProgressInput.model_validate({"initiative": "Build dashboard"})
    assert payload.makes_money == 0
    assert payload.activity_only == 0


def test_progress_assessment_rejects_invalid_kind() -> None:
    payload = _load("progress_assessment.valid.json")
    payload["kind"] = "vibes"
    with pytest.raises(ValidationError):
        ProgressAssessment.model_validate(payload)
