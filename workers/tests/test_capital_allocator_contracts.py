"""Cross-runtime lockstep tests for the Executive Capital Allocator contracts.

Mirrors `packages/shared/src/contracts/capital-allocator.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AllocateInput, AllocationPlan


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_allocation_plan_fixture_validates() -> None:
    AllocationPlan.model_validate(_load("allocation_plan.valid.json"))


def test_allocate_input_constructs() -> None:
    payload = AllocateInput.model_validate(
        {"horizon": "daily", "candidates": [{"label": "Ship feature"}]}
    )
    assert payload.candidates[0].consumes == []
    assert payload.candidates[0].expected_return == 0


def test_allocation_plan_rejects_invalid_horizon() -> None:
    payload = _load("allocation_plan.valid.json")
    payload["horizon"] = "hourly"
    with pytest.raises(ValidationError):
        AllocationPlan.model_validate(payload)


def test_allocate_input_rejects_out_of_range_return() -> None:
    with pytest.raises(ValidationError):
        AllocateInput.model_validate(
            {"horizon": "daily", "candidates": [{"label": "X", "expected_return": 2.0}]}
        )
