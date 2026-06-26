"""Cross-runtime lockstep tests for the Opportunity Cost Engine contracts.

Mirrors `packages/shared/src/contracts/opportunity-cost.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import CompareOptionsInput, OpportunityComparison


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_opportunity_comparison_fixture_validates() -> None:
    OpportunityComparison.model_validate(_load("opportunity_comparison.valid.json"))


def test_compare_options_input_constructs() -> None:
    payload = CompareOptionsInput.model_validate(
        {"options": [{"label": "A"}, {"label": "B"}]}
    )
    assert payload.question == ""
    assert payload.options[0].confidence == 0.5


def test_compare_options_input_rejects_too_few_options() -> None:
    with pytest.raises(ValidationError):
        CompareOptionsInput.model_validate({"options": [{"label": "only one"}]})


def test_opportunity_comparison_rejects_out_of_range_stress() -> None:
    with pytest.raises(ValidationError):
        CompareOptionsInput.model_validate(
            {"options": [{"label": "A", "stress_cost": 1.5}, {"label": "B"}]}
        )
