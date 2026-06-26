"""Cross-runtime lockstep tests for the Reflection contracts.

Mirrors `packages/shared/src/contracts/reflection.ts` (canonical Zod). The shared fixture
must validate against the Pydantic models; if it fails, the model is wrong, not the
fixture. Negative tests assert mirrored constraints reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ReflectionInput, ReflectionReport


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_reflection_report_fixture_validates() -> None:
    ReflectionReport.model_validate(_load("reflection_report.valid.json"))


def test_reflection_input_constructs() -> None:
    payload = ReflectionInput.model_validate({"period": "weekly"})
    assert payload.decision_quality == 0.5
    assert payload.revenue_created_usd == 0


def test_rejects_invalid_period() -> None:
    with pytest.raises(ValidationError):
        ReflectionInput.model_validate({"period": "daily"})


def test_rejects_decision_quality_out_of_range() -> None:
    with pytest.raises(ValidationError):
        ReflectionInput.model_validate({"period": "weekly", "decision_quality": 1.5})
