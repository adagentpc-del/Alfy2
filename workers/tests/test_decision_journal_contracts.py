"""Cross-runtime lockstep tests for the Executive Decision Journal contracts.

Mirrors `packages/shared/src/contracts/decision-journal.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import JournaledDecision, RecordDecisionInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_journaled_decision_fixture_validates() -> None:
    JournaledDecision.model_validate(_load("journaled_decision.valid.json"))


def test_record_decision_input_constructs() -> None:
    payload = RecordDecisionInput.model_validate({"decision": "Hire a COO"})
    assert payload.alternatives == []
    assert payload.category == ""


def test_journaled_decision_rejects_invalid_review_window() -> None:
    payload = _load("journaled_decision.valid.json")
    payload["reviewed_windows"] = ["7_day"]
    with pytest.raises(ValidationError):
        JournaledDecision.model_validate(payload)


def test_journaled_decision_rejects_extra_field() -> None:
    payload = _load("journaled_decision.valid.json")
    payload["surprise"] = 42
    with pytest.raises(ValidationError):
        JournaledDecision.model_validate(payload)
