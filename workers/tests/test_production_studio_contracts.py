"""Cross-runtime lockstep tests for the Production Studio contracts.

Mirrors `packages/shared/src/contracts/production-studio.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ProductionPreset, UpsertPresetInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_production_preset_fixture_validates() -> None:
    ProductionPreset.model_validate(_load("production_preset.valid.json"))


def test_upsert_preset_input_constructs() -> None:
    payload = UpsertPresetInput.model_validate({"brand": "decoded_podcast"})
    assert payload.intro == ""
    assert payload.auto_steps == []


def test_production_preset_rejects_invalid_brand() -> None:
    payload = _load("production_preset.valid.json")
    payload["brand"] = "not_a_brand"
    with pytest.raises(ValidationError):
        ProductionPreset.model_validate(payload)


def test_production_preset_rejects_extra_field() -> None:
    payload = _load("production_preset.valid.json")
    payload["unexpected"] = "value"
    with pytest.raises(ValidationError):
        ProductionPreset.model_validate(payload)
