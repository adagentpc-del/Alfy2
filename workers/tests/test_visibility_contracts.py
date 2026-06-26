"""Cross-runtime lockstep tests for the Visibility Engine contracts.

Mirrors `packages/shared/src/contracts/visibility.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import VisibilityInput, VisibilityReport


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_visibility_report_fixture_validates() -> None:
    VisibilityReport.model_validate(_load("visibility_report.valid.json"))


def test_visibility_input_constructs() -> None:
    payload = VisibilityInput.model_validate(
        {"business_name": "AI Authority", "signals": {}}
    )
    assert payload.signals.reach == 0
    assert payload.business_id is None


def test_visibility_report_rejects_out_of_range_score() -> None:
    payload = _load("visibility_report.valid.json")
    payload["visibility_score"] = 1.4
    with pytest.raises(ValidationError):
        VisibilityReport.model_validate(payload)


def test_visibility_input_rejects_out_of_range_engagement() -> None:
    with pytest.raises(ValidationError):
        VisibilityInput.model_validate(
            {"business_name": "X", "signals": {"engagement_rate": 2.0}}
        )
