"""Cross-runtime lockstep tests for the Capital Engine contracts.

Mirrors `packages/shared/src/contracts/capital-engine.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import CapitalReport, CapitalReportInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_capital_report_fixture_validates() -> None:
    payload = _load("capital_report.valid.json")
    model = CapitalReport.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.recommendation == payload["recommendation"]
    assert model.net_capital == payload["net_capital"]


def test_capital_report_input_constructs() -> None:
    payload = CapitalReportInput.model_validate({"recommendation": "Publish guide", "deltas": {}})
    assert payload.compounding == 0.5
    assert payload.deltas.financial == 0


def test_capital_report_rejects_out_of_range_delta() -> None:
    payload = _load("capital_report.valid.json")
    payload["deltas"]["financial"] = 2
    with pytest.raises(ValidationError):
        CapitalReport.model_validate(payload)


def test_capital_report_rejects_out_of_range_net() -> None:
    payload = _load("capital_report.valid.json")
    payload["net_capital"] = -2
    with pytest.raises(ValidationError):
        CapitalReport.model_validate(payload)
