"""Cross-runtime lockstep tests for the Sales Asset Generator contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/sales-asset.ts` (canonical). If a fixture fails here, the
model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import GenerateSalesAssetsInput, SalesAssetPack


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


def test_sales_asset_pack_fixture_validates() -> None:
    SalesAssetPack.model_validate(_load("sales_asset_pack.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_generate_sales_assets_input_constructs() -> None:
    payload = GenerateSalesAssetsInput.model_validate({"business_name": "Move Mi"})
    assert payload.offer == ""
    assert payload.audience == ""


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_sales_asset_pack_rejects_invalid_kind() -> None:
    payload = _load("sales_asset_pack.valid.json")
    payload["assets"][0]["kind"] = "tiktok"
    with pytest.raises(ValidationError):
        SalesAssetPack.model_validate(payload)
