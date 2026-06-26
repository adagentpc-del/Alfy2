"""Cross-runtime lockstep tests for the Failure Database + Future Trends Lab contracts.

Mirrors packages/shared/src/contracts/failure-trends.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import CaptureFailureInput, FailureCase, Trend


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_failure_case_fixture_validates() -> None:
    FailureCase.model_validate(_load("failure_case.valid.json"))


def test_trend_fixture_validates() -> None:
    Trend.model_validate(_load("trend.valid.json"))


def test_capture_failure_input_constructs() -> None:
    payload = CaptureFailureInput.model_validate({"kind": "fraud", "title": "X"})
    assert payload.what_happened == ""
    assert payload.timeline == []


def test_failure_case_rejects_invalid_kind() -> None:
    payload = _load("failure_case.valid.json")
    payload["kind"] = "oopsie"
    with pytest.raises(ValidationError):
        FailureCase.model_validate(payload)


def test_trend_rejects_out_of_range_readiness_score() -> None:
    payload = _load("trend.valid.json")
    payload["readiness_score"] = 2
    with pytest.raises(ValidationError):
        Trend.model_validate(payload)
