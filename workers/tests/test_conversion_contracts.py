"""Cross-runtime lockstep tests for the Conversion Engine contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/conversion.ts` (canonical). If a fixture fails here, the
model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ConversionProfile, OfferPerf


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


def test_conversion_profile_fixture_validates() -> None:
    ConversionProfile.model_validate(_load("conversion_profile.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_offer_perf_constructs() -> None:
    offer = OfferPerf.model_validate({"name": "Monthly retainer"})
    assert offer.conversion_rate == 0
    assert offer.revenue_usd == 0


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_copy_snippet_rejects_invalid_surface() -> None:
    payload = _load("conversion_profile.valid.json")
    payload["winning_copy"][0]["surface"] = "banner"
    with pytest.raises(ValidationError):
        ConversionProfile.model_validate(payload)


def test_conversion_test_rejects_invalid_status() -> None:
    payload = _load("conversion_profile.valid.json")
    payload["active_tests"][0]["status"] = "tied"
    with pytest.raises(ValidationError):
        ConversionProfile.model_validate(payload)


def test_conversion_test_rejects_out_of_range_conversion() -> None:
    payload = _load("conversion_profile.valid.json")
    payload["active_tests"][0]["conversion_a"] = 1.5
    with pytest.raises(ValidationError):
        ConversionProfile.model_validate(payload)
