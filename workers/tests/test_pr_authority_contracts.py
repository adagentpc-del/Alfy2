"""Cross-runtime lockstep tests for the PR & Authority Engine contracts.

Mirrors `packages/shared/src/contracts/pr-authority.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import DetectPrInput, PrOpportunity


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_pr_opportunity_fixture_validates() -> None:
    PrOpportunity.model_validate(_load("pr_opportunity.valid.json"))


def test_detect_pr_input_constructs() -> None:
    payload = DetectPrInput.model_validate({"trigger": "funding", "headline": "Raised $4M"})
    assert payload.business_name == ""
    assert payload.business_id is None


def test_pr_opportunity_rejects_invalid_trigger() -> None:
    payload = _load("pr_opportunity.valid.json")
    payload["trigger"] = "rumor"
    with pytest.raises(ValidationError):
        PrOpportunity.model_validate(payload)


def test_pr_opportunity_rejects_invalid_status() -> None:
    payload = _load("pr_opportunity.valid.json")
    payload["status"] = "ghosted"
    with pytest.raises(ValidationError):
        PrOpportunity.model_validate(payload)
