"""Cross-runtime lockstep tests for the Capital Allocation Board contracts.

Mirrors `packages/shared/src/contracts/capital-board.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AllocateBoardInput, CapitalBoardDecision


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_capital_board_decision_fixture_validates() -> None:
    payload = _load("capital_board_decision.valid.json")
    model = CapitalBoardDecision.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.top_pick == payload["top_pick"]


def test_allocate_board_input_constructs() -> None:
    payload = AllocateBoardInput.model_validate({"options": [{"label": "Build SaaS"}]})
    assert payload.options[0].risk == 0.5
    assert payload.options[0].automatable is False


def test_allocate_board_input_rejects_empty_options() -> None:
    with pytest.raises(ValidationError):
        AllocateBoardInput.model_validate({"options": []})


def test_capital_board_decision_rejects_invalid_disposition() -> None:
    payload = _load("capital_board_decision.valid.json")
    payload["verdicts"][0]["disposition"] = "yolo"
    with pytest.raises(ValidationError):
        CapitalBoardDecision.model_validate(payload)
