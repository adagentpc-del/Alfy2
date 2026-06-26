"""Cross-runtime lockstep tests for the Elite Money Game Engine contracts.

Mirrors packages/shared/src/contracts/money-game.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import MoneyGameInput, MoneyGamePlan


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_money_game_plan_fixture_validates() -> None:
    MoneyGamePlan.model_validate(_load("money_game_plan.valid.json"))


def test_money_game_input_constructs() -> None:
    payload = MoneyGameInput.model_validate({"subject": "Alyssa"})
    assert payload.owns_business is True
    assert payload.focus == []


def test_money_game_plan_rejects_invalid_strategy_kind() -> None:
    payload = _load("money_game_plan.valid.json")
    payload["strategies"][0]["kind"] = "crypto_yolo"
    with pytest.raises(ValidationError):
        MoneyGamePlan.model_validate(payload)


def test_money_game_plan_rejects_false_legal_avoidance_flag() -> None:
    payload = _load("money_game_plan.valid.json")
    payload["legal_avoidance_only"] = False
    with pytest.raises(ValidationError):
        MoneyGamePlan.model_validate(payload)
