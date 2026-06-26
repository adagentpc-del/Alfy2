"""Cross-runtime lockstep tests for the PR Department contracts.

Mirrors packages/shared/src/contracts/pr.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import GeneratePrInput, PrStrategy


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_pr_strategy_fixture_validates() -> None:
    PrStrategy.model_validate(_load("pr_strategy.valid.json"))


def test_generate_pr_input_constructs() -> None:
    payload = GeneratePrInput.model_validate({"business_name": "AI Authority"})
    assert payload.founder_name == "Alyssa DelTorre"
    assert payload.business_id is None


def test_pr_strategy_rejects_invalid_business_id() -> None:
    payload = _load("pr_strategy.valid.json")
    payload["business_id"] = "not-a-uuid"
    with pytest.raises(ValidationError):
        PrStrategy.model_validate(payload)


def test_pr_strategy_rejects_empty_founder_story_angle() -> None:
    payload = _load("pr_strategy.valid.json")
    payload["founder_story_angle"] = ""
    with pytest.raises(ValidationError):
        PrStrategy.model_validate(payload)
