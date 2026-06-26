"""Cross-runtime lockstep tests for the Enterprise Risk Register contracts.

Mirrors `packages/shared/src/contracts/risk-register.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AddRiskInput, EnterpriseRisk


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_enterprise_risk_fixture_validates() -> None:
    payload = _load("risk.valid.json")
    model = EnterpriseRisk.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.category == payload["category"]
    assert model.status == payload["status"]


def test_add_risk_input_constructs() -> None:
    payload = AddRiskInput.model_validate({"category": "legal", "title": "Open contract"})
    assert payload.severity == 0.5
    assert payload.deadline is None
    assert payload.affected_businesses == []


def test_enterprise_risk_rejects_invalid_category() -> None:
    payload = _load("risk.valid.json")
    payload["category"] = "vibes"
    with pytest.raises(ValidationError):
        EnterpriseRisk.model_validate(payload)
