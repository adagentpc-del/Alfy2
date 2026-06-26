"""Cross-runtime lockstep tests for the Revenue Truth System contracts.

Mirrors `packages/shared/src/contracts/revenue-truth.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import RevenueTruthInput, RevenueTruthReport


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_revenue_truth_report_fixture_validates() -> None:
    payload = _load("revenue_truth_report.valid.json")
    model = RevenueTruthReport.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.business_name == payload["business_name"]
    assert model.next_money_action == payload["next_money_action"]


def test_revenue_truth_input_constructs() -> None:
    payload = RevenueTruthInput.model_validate({"business_name": "Acme"})
    assert payload.stalled_after_days == 14
    assert payload.deals == []


def test_revenue_truth_report_rejects_invalid_stage() -> None:
    payload = _load("revenue_truth_report.valid.json")
    with pytest.raises(ValidationError):
        RevenueTruthInput.model_validate(
            {"business_name": "Acme", "deals": [{"name": "X", "stage": "maybe"}]}
        )
    # Report itself has no stage field; ensure negative usd is rejected.
    payload["cash_collected_usd"] = -1
    with pytest.raises(ValidationError):
        RevenueTruthReport.model_validate(payload)
