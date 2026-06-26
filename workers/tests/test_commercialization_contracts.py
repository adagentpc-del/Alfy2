"""Cross-runtime lockstep tests for the Commercialization contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/commercialization.ts` (canonical). If a fixture fails
here, the model is wrong, not the fixture.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ClassifyFeatureInput, FeatureClassification


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


def test_feature_classification_fixture_validates() -> None:
    FeatureClassification.model_validate(_load("feature_classification.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_classify_feature_input_constructs() -> None:
    payload = ClassifyFeatureInput.model_validate(
        {"feature_name": "Revenue Factory", "tier": "founder_saas_feature"}
    )
    assert payload.saas_module_candidate is False
    assert payload.readiness == 0


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_feature_classification_rejects_invalid_tier() -> None:
    payload = _load("feature_classification.valid.json")
    payload["tier"] = "free"
    with pytest.raises(ValidationError):
        FeatureClassification.model_validate(payload)


def test_feature_classification_rejects_readiness_over_one() -> None:
    payload = _load("feature_classification.valid.json")
    payload["readiness"] = 2
    with pytest.raises(ValidationError):
        FeatureClassification.model_validate(payload)
