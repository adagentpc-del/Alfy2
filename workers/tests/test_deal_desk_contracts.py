"""Cross-runtime lockstep tests for the Deal Desk contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/deal-desk.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import CreateDealInput, Deal


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- Positive: shared fixture must validate ---


def test_deal_fixture_validates() -> None:
    Deal.model_validate(_load("deal.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_create_deal_input_constructs() -> None:
    payload = CreateDealInput.model_validate(
        {"buyer_contact": "Jordan Vance", "offer": "AI Authority Intensive"}
    )
    assert payload.business_id is None
    assert payload.business_name == ""
    assert payload.deal_size_usd == 0
    assert payload.probability == 0.5
    assert payload.stage == "new"
    assert payload.follow_up_status == "none"
    assert payload.risk == 0
    assert payload.effort == 0.5
    assert payload.strategic_value == 0.5


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_deal_rejects_invalid_stage() -> None:
    payload = _load("deal.valid.json")
    payload["stage"] = "closed"
    with pytest.raises(ValidationError):
        Deal.model_validate(payload)


def test_deal_rejects_out_of_range_probability() -> None:
    payload = _load("deal.valid.json")
    payload["probability"] = 1.5
    with pytest.raises(ValidationError):
        Deal.model_validate(payload)
