"""Cross-runtime lockstep tests for the Founder Operating Principle contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/founder-principle.ts` (canonical). If a fixture fails
here, the model is wrong, not the fixture.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    BusinessNextActions,
    IdeaDisposition,
    IdeaSignals,
    NextActionsInput,
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


# --- Positive: shared fixture must validate ---


def test_idea_disposition_fixture_validates() -> None:
    IdeaDisposition.model_validate(_load("idea_disposition.valid.json"))


# --- Positive: inline-constructed models must validate ---


def test_next_actions_input_constructs() -> None:
    payload = NextActionsInput.model_validate({"business_name": "Move Mi"})
    assert payload.money_candidate == ""
    assert payload.asset_gap == ""


def test_business_next_actions_constructs() -> None:
    payload = BusinessNextActions.model_validate(
        {
            "business_name": "Move Mi",
            "next_money_action": "Send the proposal",
            "next_risk_action": "Renew the contract",
            "next_follow_up_action": "Chase the quiet lead",
            "next_asset_to_build": "Case study",
            "next_conversion_improvement": "Tighten the CTA",
            "generated_at": "2026-06-25T12:00:00.000Z",
        }
    )
    assert payload.business_name == "Move Mi"


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_idea_disposition_rejects_invalid_disposition() -> None:
    payload = _load("idea_disposition.valid.json")
    payload["disposition"] = "maybe_later"
    with pytest.raises(ValidationError):
        IdeaDisposition.model_validate(payload)


def test_idea_signals_rejects_value_over_one() -> None:
    with pytest.raises(ValidationError):
        IdeaSignals.model_validate({"value": 1.5})
