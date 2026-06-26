"""Cross-runtime lockstep tests for the Confidence-Weighted Agent Council contracts.

Mirrors `packages/shared/src/contracts/agent-council.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ConveneCouncilInput, CouncilVerdict


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_council_verdict_fixture_validates() -> None:
    payload = _load("council_verdict.valid.json")
    model = CouncilVerdict.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.kind == payload["kind"]
    assert len(model.opinions) == len(payload["opinions"])


def test_convene_council_input_constructs() -> None:
    payload = ConveneCouncilInput.model_validate(
        {"kind": "major_launch", "decision": "Launch", "signals": {}}
    )
    assert payload.signals.revenue_upside == 0.5
    assert payload.signals.data_completeness == 0.5


def test_council_verdict_rejects_invalid_role() -> None:
    payload = _load("council_verdict.valid.json")
    payload["opinions"][0]["role"] = "court_jester"
    with pytest.raises(ValidationError):
        CouncilVerdict.model_validate(payload)
