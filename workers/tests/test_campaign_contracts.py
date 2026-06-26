"""Cross-runtime lockstep tests for the Campaign Intelligence contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/campaign.ts` (which is canonical); if a fixture fails
here, the model is wrong, not the fixture. Negative tests assert that constraints
mirrored from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    Campaign,
    CampaignSuccessMetric,
    CreateCampaignInput,
    Variant,
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


def test_campaign_fixture_validates() -> None:
    Campaign.model_validate(_load("campaign.valid.json"))


def test_create_campaign_input_fixture_validates() -> None:
    CreateCampaignInput.model_validate(_load("create_campaign_input.valid.json"))


# --- Positive tests: inline-constructed models (no fixture) must validate ---


def test_variant_constructs() -> None:
    variant = Variant.model_validate(
        {
            "key": "A",
            "name": "Direct offer",
            "hypothesis": "A blunt savings offer converts best.",
            "content": "Save 20% with a retainer.",
            "traffic_weight": 0.5,
        }
    )
    assert variant.key == "A"
    assert variant.traffic_weight == 0.5


def test_success_metric_constructs() -> None:
    metric = CampaignSuccessMetric.model_validate(
        {
            "name": "conversion_rate",
            "target": 0.08,
            "unit": "ratio",
            "direction": "higher_better",
            "primary": True,
        }
    )
    assert metric.direction == "higher_better"
    assert metric.primary is True


def test_success_metric_defaults() -> None:
    metric = CampaignSuccessMetric.model_validate({"name": "reply_rate", "target": 0.15})
    assert metric.unit == ""
    assert metric.direction == "higher_better"
    assert metric.primary is False


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_campaign_rejects_invalid_type() -> None:
    payload = _load("campaign.valid.json")
    payload["type"] = "sms"
    with pytest.raises(ValidationError):
        Campaign.model_validate(payload)


def test_campaign_rejects_single_variant() -> None:
    payload = _load("campaign.valid.json")
    payload["variants"] = payload["variants"][:1]
    with pytest.raises(ValidationError):
        Campaign.model_validate(payload)


def test_variant_rejects_traffic_weight_above_one() -> None:
    with pytest.raises(ValidationError):
        Variant.model_validate(
            {
                "key": "A",
                "name": "Direct offer",
                "hypothesis": "A blunt savings offer converts best.",
                "traffic_weight": 1.5,
            }
        )


def test_variant_result_rejects_conversion_rate_above_one() -> None:
    from alfy_workers.contracts import VariantResult

    with pytest.raises(ValidationError):
        VariantResult.model_validate(
            {
                "variant_key": "A",
                "impressions": 1000,
                "conversions": 60,
                "conversion_rate": 1.2,
            }
        )
