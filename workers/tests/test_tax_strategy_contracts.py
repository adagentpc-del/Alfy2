"""Cross-runtime lockstep tests for the Tax Strategy Analyzer contracts.

Mirrors packages/shared/src/contracts/tax-strategy.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import TaxAnalysis, TaxAnalysisInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_tax_analysis_fixture_validates() -> None:
    TaxAnalysis.model_validate(_load("tax_analysis.valid.json"))


def test_tax_analysis_input_constructs() -> None:
    payload = TaxAnalysisInput.model_validate({"subject": "Acme LLC"})
    assert payload.is_business is True
    assert payload.owner_count == 1


def test_tax_analysis_rejects_invalid_area() -> None:
    payload = _load("tax_analysis.valid.json")
    payload["recommendations"][0]["area"] = "not_an_area"
    with pytest.raises(ValidationError):
        TaxAnalysis.model_validate(payload)


def test_tax_analysis_input_rejects_non_positive_owner_count() -> None:
    with pytest.raises(ValidationError):
        TaxAnalysisInput.model_validate({"subject": "Acme LLC", "owner_count": 0})
