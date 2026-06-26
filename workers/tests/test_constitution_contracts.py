"""Cross-runtime lockstep tests for the Constitution contracts.

Mirrors `packages/shared/src/contracts/constitution.ts` (canonical Zod). The shared
fixture must validate against the Pydantic models; if it fails, the model is wrong, not
the fixture. Negative tests assert mirrored constraints reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    ConstitutionCheckInput,
    ConstitutionPrinciple,
    ConstitutionVerdict,
)


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_constitution_verdict_fixture_validates() -> None:
    ConstitutionVerdict.model_validate(_load("constitution_verdict.valid.json"))


def test_constitution_check_input_constructs() -> None:
    payload = ConstitutionCheckInput.model_validate({"description": "Ship the thing"})
    assert payload.irreversible is False
    assert payload.documented_reason == ""


def test_rejects_invalid_principle_id() -> None:
    payload = _load("constitution_verdict.valid.json")
    payload["verdicts"][0]["principle"] = "be_nice"
    with pytest.raises(ValidationError):
        ConstitutionVerdict.model_validate(payload)


def test_rejects_principle_number_out_of_range() -> None:
    with pytest.raises(ValidationError):
        ConstitutionPrinciple.model_validate(
            {
                "id": "human_in_command",
                "number": 11,
                "title": "Human in command",
                "text": "Humans remain in command.",
            }
        )
