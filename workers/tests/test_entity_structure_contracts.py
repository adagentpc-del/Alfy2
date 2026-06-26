"""Cross-runtime lockstep tests for the Entity Structure Optimizer contracts.

Mirrors packages/shared/src/contracts/entity-structure.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import EntityAnalysis, EntityAnalysisInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_entity_analysis_fixture_validates() -> None:
    EntityAnalysis.model_validate(_load("entity_analysis.valid.json"))


def test_entity_analysis_input_constructs() -> None:
    payload = EntityAnalysisInput.model_validate({"business_name": "Acme"})
    assert payload.current_structure == "llc"
    assert payload.owner_count == 1


def test_entity_analysis_rejects_invalid_structure() -> None:
    payload = _load("entity_analysis.valid.json")
    payload["recommended_structure"] = "partnership"
    with pytest.raises(ValidationError):
        EntityAnalysis.model_validate(payload)


def test_entity_analysis_input_rejects_non_positive_owner_count() -> None:
    with pytest.raises(ValidationError):
        EntityAnalysisInput.model_validate({"business_name": "Acme", "owner_count": -1})
