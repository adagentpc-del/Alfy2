"""Cross-runtime lockstep tests for the Leverage Engine contracts.

Mirrors `packages/shared/src/contracts/leverage.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import LeverageComparison, ScoreLeverageInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_leverage_comparison_fixture_validates() -> None:
    LeverageComparison.model_validate(_load("leverage_comparison.valid.json"))


def test_score_leverage_input_constructs() -> None:
    payload = ScoreLeverageInput.model_validate({"option_label": "Build SOP", "inputs": {}})
    assert payload.inputs.revenue_impact == 0
    assert payload.inputs.longevity == 0


def test_leverage_comparison_rejects_invalid_tier() -> None:
    payload = _load("leverage_comparison.valid.json")
    payload["ranked"][0]["tier"] = "infinite"
    with pytest.raises(ValidationError):
        LeverageComparison.model_validate(payload)


def test_leverage_comparison_rejects_out_of_range_score() -> None:
    payload = _load("leverage_comparison.valid.json")
    payload["ranked"][0]["score"] = 1.3
    with pytest.raises(ValidationError):
        LeverageComparison.model_validate(payload)
