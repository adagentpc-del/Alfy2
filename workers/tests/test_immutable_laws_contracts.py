"""Cross-runtime lockstep tests for the Immutable Laws contracts.

Mirrors `packages/shared/src/contracts/immutable-laws.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import LawCheckInput, LawCompliance


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_law_compliance_fixture_validates() -> None:
    LawCompliance.model_validate(_load("law_compliance.valid.json"))


def test_law_check_input_constructs() -> None:
    payload = LawCheckInput.model_validate({"recommendation": "Build a workflow"})
    assert payload.harms_human is False
    assert payload.increases_freedom is False


def test_law_compliance_rejects_invalid_law_id() -> None:
    payload = _load("law_compliance.valid.json")
    payload["verdicts"][0]["law"] = "make_money_only"
    with pytest.raises(ValidationError):
        LawCompliance.model_validate(payload)


def test_immutable_law_rejects_out_of_range_number() -> None:
    with pytest.raises(ValidationError):
        from alfy_workers.contracts import ImmutableLaw

        ImmutableLaw.model_validate(
            {"id": "protect_the_human", "number": 9, "title": "T", "text": "X"}
        )
