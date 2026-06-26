"""Cross-runtime lockstep tests for the Opportunity Intelligence contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/opportunity.ts` (which is canonical); if a fixture fails
here, the model is wrong, not the fixture. Negative tests assert that constraints
mirrored from Zod actually reject invalid payloads.

Note: the opportunity.ts `OpportunitySchema` is mirrored as `OpportunityIntel` (not
`Opportunity`) because a different `Opportunity` model already exists in the mirror
(the goal.ts opportunity). All other names mirror one-to-one.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    AnalyzeInput,
    EntityRef,
    OpportunityIntel,
    OpportunityScore,
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


def test_opportunity_fixture_validates() -> None:
    OpportunityIntel.model_validate(_load("opportunity.valid.json"))


def test_analyze_input_fixture_validates() -> None:
    AnalyzeInput.model_validate(_load("analyze_input.valid.json"))


# --- Positive tests: inline-constructed models (no fixture) must validate ---


def test_entity_ref_constructs() -> None:
    ref = EntityRef.model_validate(
        {
            "ref_id": "investor:acme-ventures",
            "kind": "investor",
            "name": "Acme Ventures",
            "keywords": ["seed", "logistics"],
        }
    )
    assert ref.kind == "investor"
    assert ref.business_id is None
    assert ref.tags == []
    assert ref.attributes == {}


def test_opportunity_score_constructs() -> None:
    score = OpportunityScore.model_validate(
        {
            "revenue": 0.5,
            "probability": 0.4,
            "effort": 0.2,
            "risk": 0.1,
            "strategic_value": 0.6,
            "composite": 0.55,
        }
    )
    assert score.revenue == 0.5
    assert score.composite == 0.55


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_entity_ref_rejects_invalid_kind() -> None:
    with pytest.raises(ValidationError):
        EntityRef.model_validate(
            {
                "ref_id": "x:robot",
                "kind": "robot",
                "name": "Robot",
            }
        )


def test_opportunity_rejects_invalid_relationship_kind() -> None:
    payload = _load("opportunity.valid.json")
    payload["kind"] = "rivalry"
    with pytest.raises(ValidationError):
        OpportunityIntel.model_validate(payload)


def test_opportunity_score_rejects_revenue_above_one() -> None:
    with pytest.raises(ValidationError):
        OpportunityScore.model_validate(
            {
                "revenue": 1.5,
                "probability": 0.4,
                "effort": 0.2,
                "risk": 0.1,
                "strategic_value": 0.6,
                "composite": 0.55,
            }
        )


def test_analyze_input_rejects_single_entity() -> None:
    payload = _load("analyze_input.valid.json")
    payload["entities"] = payload["entities"][:1]
    with pytest.raises(ValidationError):
        AnalyzeInput.model_validate(payload)
