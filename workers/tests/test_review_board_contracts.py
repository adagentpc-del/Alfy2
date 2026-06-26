"""Cross-runtime lockstep tests for the Executive Review Board contracts.

Mirrors `packages/shared/src/contracts/review-board.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import BoardReview, ConveneBoardInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_board_review_fixture_validates() -> None:
    BoardReview.model_validate(_load("board_review.valid.json"))


def test_convene_board_input_constructs() -> None:
    payload = ConveneBoardInput.model_validate({"proposal": "Launch service", "signals": {}})
    assert payload.signals.revenue_upside == 0.5
    assert payload.business_id is None


def test_board_review_rejects_invalid_role() -> None:
    payload = _load("board_review.valid.json")
    payload["verdicts"][0]["role"] = "chief_vibes_officer"
    with pytest.raises(ValidationError):
        BoardReview.model_validate(payload)


def test_convene_board_input_rejects_out_of_range_signal() -> None:
    with pytest.raises(ValidationError):
        ConveneBoardInput.model_validate(
            {"proposal": "X", "signals": {"revenue_upside": 1.5}}
        )
