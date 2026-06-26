"""Cross-runtime lockstep tests for the Business Asset Checklist contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/asset-checklist.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AssetChecklist, BuildChecklistInput


def _repo_root() -> Path:
    """Walk up from this test file until we find the repo root (has packages/shared/fixtures)."""
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- Positive: shared fixture must validate ---


def test_asset_checklist_fixture_validates() -> None:
    AssetChecklist.model_validate(_load("asset_checklist.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_build_checklist_input_constructs() -> None:
    payload = BuildChecklistInput.model_validate({"business_name": "Move Mi"})
    assert payload.business_id is None
    assert payload.present == []


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_asset_checklist_rejects_invalid_present_item() -> None:
    payload = _load("asset_checklist.valid.json")
    payload["present"] = ["website"]
    with pytest.raises(ValidationError):
        AssetChecklist.model_validate(payload)


def test_asset_checklist_rejects_out_of_range_completeness() -> None:
    payload = _load("asset_checklist.valid.json")
    payload["completeness"] = 1.5
    with pytest.raises(ValidationError):
        AssetChecklist.model_validate(payload)
