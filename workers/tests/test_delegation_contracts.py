"""Cross-runtime lockstep tests for the Executive Delegation System contracts.

Mirrors `packages/shared/src/contracts/delegation.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ClassifyTaskInput, DelegationDecision


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_delegation_decision_fixture_validates() -> None:
    payload = _load("delegation_decision.valid.json")
    model = DelegationDecision.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.owner == payload["owner"]


def test_classify_task_input_constructs() -> None:
    payload = ClassifyTaskInput.model_validate({"task": "File taxes"})
    assert payload.risk == 0.3
    assert payload.sop_available is False


def test_delegation_decision_rejects_invalid_owner() -> None:
    payload = _load("delegation_decision.valid.json")
    payload["owner"] = "the_intern"
    with pytest.raises(ValidationError):
        DelegationDecision.model_validate(payload)
