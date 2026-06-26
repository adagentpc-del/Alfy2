"""Cross-runtime lockstep tests for the Global Asset Library contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/assets.ts` (which is canonical); if a fixture fails here,
the model is wrong, not the fixture. Negative tests assert that constraints mirrored from
Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    Asset,
    AssetQuery,
    AssetSearchHit,
)


def _repo_root() -> Path:
    """Walk up from this test file until we find the repo root (has packages/shared/fixtures)."""
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- Positive tests: shared fixtures must validate against the mirrored models ---


def test_asset_fixture_validates() -> None:
    Asset.model_validate(_load("asset.valid.json"))


def test_asset_query_fixture_validates() -> None:
    AssetQuery.model_validate(_load("asset_query.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_asset_rejects_invalid_type() -> None:
    payload = _load("asset.valid.json")
    payload["type"] = "spaceship"
    with pytest.raises(ValidationError):
        Asset.model_validate(payload)


def test_asset_search_hit_rejects_out_of_range_score() -> None:
    with pytest.raises(ValidationError):
        AssetSearchHit.model_validate(
            {
                "asset_id": "20202020-1111-4aaa-8aaa-202020202020",
                "name": "Move Mi — Seed Pitch Deck",
                "type": "pitch_deck",
                "business_id": "move-mi",
                "score": 1.5,
                "snippet": "",
            }
        )


def test_asset_rejects_invalid_visibility() -> None:
    payload = _load("asset.valid.json")
    payload["visibility"] = "secret"
    with pytest.raises(ValidationError):
        Asset.model_validate(payload)
