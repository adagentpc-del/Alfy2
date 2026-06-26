"""Cross-runtime lockstep tests for the Revenue Command System contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/revenue.ts` (canonical). If a fixture fails here, the
model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import PipelineDeal, RevenueIntel, RevenueOffer, RevenueProfileInput


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


def test_revenue_intel_fixture_validates() -> None:
    RevenueIntel.model_validate(_load("revenue_intel.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_revenue_offer_constructs() -> None:
    offer = RevenueOffer.model_validate({"name": "Monthly retainer", "price_usd": 300})
    assert offer.conversion_rate == 0


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_pipeline_deal_rejects_out_of_range_probability() -> None:
    with pytest.raises(ValidationError):
        PipelineDeal.model_validate(
            {"name": "Acme", "value_usd": 1000, "probability": 1.5}
        )


def test_revenue_profile_input_rejects_zero_stuck_after_days() -> None:
    with pytest.raises(ValidationError):
        RevenueProfileInput.model_validate(
            {"business_name": "Move Mi", "stuck_after_days": 0}
        )
