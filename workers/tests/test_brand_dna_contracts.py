"""Cross-runtime lockstep tests for the Brand DNA contracts.

Mirrors `packages/shared/src/contracts/brand-dna.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import BrandDna, UpsertBrandInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_brand_dna_fixture_validates() -> None:
    BrandDna.model_validate(_load("brand_dna.valid.json"))


def test_upsert_brand_input_constructs() -> None:
    payload = UpsertBrandInput.model_validate({"key": "founderos"})
    assert payload.name is None
    assert payload.humor_level is None


def test_brand_dna_rejects_invalid_key() -> None:
    payload = _load("brand_dna.valid.json")
    payload["key"] = "not_a_brand"
    with pytest.raises(ValidationError):
        BrandDna.model_validate(payload)


def test_brand_dna_rejects_out_of_range_humor() -> None:
    payload = _load("brand_dna.valid.json")
    payload["humor_level"] = 1.5
    with pytest.raises(ValidationError):
        BrandDna.model_validate(payload)
