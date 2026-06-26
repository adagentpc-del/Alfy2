"""Cross-runtime lockstep tests for the Billion-Dollar Operator Mode contracts.

Mirrors `packages/shared/src/contracts/operator-mode.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import OperatorReview, OperatorReviewInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_operator_review_fixture_validates() -> None:
    payload = _load("operator_review.valid.json")
    model = OperatorReview.model_validate(payload)
    assert model.model_dump(mode="json") == payload


def test_operator_review_input_constructs() -> None:
    payload = OperatorReviewInput.model_validate({"recommendation": "Do the thing"})
    assert payload.scalability == 0.5
    assert payload.legal_exposure == 0.3


def test_operator_review_rejects_out_of_range_fit() -> None:
    payload = _load("operator_review.valid.json")
    payload["hundred_m_fit"] = 2
    with pytest.raises(ValidationError):
        OperatorReview.model_validate(payload)
