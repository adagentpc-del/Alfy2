"""Cross-runtime lockstep tests for the Finance Command Center contracts.

Mirrors packages/shared/src/contracts/finance-command.ts (canonical). If a fixture fails
here, the model is wrong, not the fixture.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import BusinessFinanceInput, FinanceOverview


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_finance_overview_fixture_validates() -> None:
    FinanceOverview.model_validate(_load("finance_overview.valid.json"))


def test_business_finance_input_constructs() -> None:
    payload = BusinessFinanceInput.model_validate({"business_name": "Acme"})
    assert payload.tax_rate == 0.25
    assert payload.monthly_revenue_usd == 0


def test_finance_overview_rejects_negative_tax_exposure() -> None:
    payload = _load("finance_overview.valid.json")
    payload["total_tax_exposure_usd"] = -1
    with pytest.raises(ValidationError):
        FinanceOverview.model_validate(payload)


def test_finance_overview_rejects_false_money_actions_flag() -> None:
    payload = _load("finance_overview.valid.json")
    payload["money_actions_require_approval"] = False
    with pytest.raises(ValidationError):
        FinanceOverview.model_validate(payload)
