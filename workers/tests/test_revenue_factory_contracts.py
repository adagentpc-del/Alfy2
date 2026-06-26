"""Cross-runtime lockstep tests for the Revenue Factory contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/revenue-factory.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    FactoryContact,
    FactoryOffer,
    RevenueFactoryInput,
    RevenueFactoryReport,
)


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- Positive: shared fixture must validate ---


def test_revenue_factory_report_fixture_validates() -> None:
    RevenueFactoryReport.model_validate(_load("revenue_factory_report.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_revenue_factory_input_constructs() -> None:
    payload = RevenueFactoryInput.model_validate({"business_name": "Move Mi"})
    assert payload.business_id is None
    assert payload.offers == []
    assert payload.booked_calls == 0
    assert payload.revenue_generated_usd == 0


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_factory_contact_rejects_invalid_temperature() -> None:
    with pytest.raises(ValidationError):
        FactoryContact.model_validate({"name": "Dana", "temperature": "lukewarm"})


def test_factory_offer_rejects_out_of_range_conversion_rate() -> None:
    with pytest.raises(ValidationError):
        FactoryOffer.model_validate(
            {"name": "Local Move Package", "price_usd": 18000, "conversion_rate": 1.5}
        )
