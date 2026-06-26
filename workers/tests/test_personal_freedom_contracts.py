"""Cross-runtime lockstep tests for the Personal Freedom Engine contracts.

Mirrors `packages/shared/src/contracts/personal-freedom.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import FreedomLogInput, FreedomReport


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_freedom_report_fixture_validates() -> None:
    FreedomReport.model_validate(_load("freedom_report.valid.json"))


def test_freedom_log_input_constructs() -> None:
    payload = FreedomLogInput.model_validate({"week_label": "2026-W26"})
    assert payload.hours_working == 0
    assert payload.hours_rest == 0


def test_freedom_report_rejects_invalid_action() -> None:
    payload = _load("freedom_report.valid.json")
    payload["recommendations"][0]["action"] = "quit"
    with pytest.raises(ValidationError):
        FreedomReport.model_validate(payload)


def test_freedom_report_rejects_out_of_range_score() -> None:
    payload = _load("freedom_report.valid.json")
    payload["freedom_score"] = 1.2
    with pytest.raises(ValidationError):
        FreedomReport.model_validate(payload)
