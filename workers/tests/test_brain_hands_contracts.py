"""Cross-runtime lockstep tests for the Brain/Hands Separation contracts.

Mirrors `packages/shared/src/contracts/brain-hands.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ExecFlowRequest, FlowDecision


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_flow_decision_fixture_validates() -> None:
    payload = _load("flow_decision.valid.json")
    model = FlowDecision.model_validate(payload)
    assert model.model_dump(mode="json") == payload


def test_exec_flow_request_constructs() -> None:
    payload = ExecFlowRequest.model_validate({"capability": "send_email"})
    assert payload.brain_recommended is False
    assert payload.approved is None


def test_flow_decision_rejects_missing_reason() -> None:
    payload = _load("flow_decision.valid.json")
    payload["reason"] = ""
    with pytest.raises(ValidationError):
        FlowDecision.model_validate(payload)
