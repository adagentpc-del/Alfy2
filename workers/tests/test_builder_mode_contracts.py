"""Cross-runtime lockstep tests for the Builder Mode contracts.

Mirrors `packages/shared/src/contracts/builder-mode.ts` (canonical Zod). The shared
fixture must validate against the Pydantic models; if it fails, the model is wrong, not
the fixture. Negative tests assert mirrored constraints reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import StartBuildInput, VentureBlueprint


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_venture_blueprint_fixture_validates() -> None:
    VentureBlueprint.model_validate(_load("venture_blueprint.valid.json"))


def test_start_build_input_constructs() -> None:
    payload = StartBuildInput.model_validate({"idea": "A marketplace for X"})
    assert payload.business_name == ""
    assert payload.target_market == ""


def test_rejects_invalid_stage() -> None:
    payload = _load("venture_blueprint.valid.json")
    payload["stages"][0]["stage"] = "funding"
    with pytest.raises(ValidationError):
        VentureBlueprint.model_validate(payload)


def test_rejects_invalid_status() -> None:
    payload = _load("venture_blueprint.valid.json")
    payload["status"] = "live"
    with pytest.raises(ValidationError):
        VentureBlueprint.model_validate(payload)
