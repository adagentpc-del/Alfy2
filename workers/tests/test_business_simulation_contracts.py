"""Cross-runtime lockstep tests for the Business Simulation contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/business-simulation.ts` (canonical). If a fixture fails
here, the model is wrong, not the fixture.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import BusinessSimulation, SimulateDecisionInput


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


def test_business_simulation_fixture_validates() -> None:
    BusinessSimulation.model_validate(_load("business_simulation.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_simulate_decision_input_constructs() -> None:
    payload = SimulateDecisionInput.model_validate(
        {
            "kind": "focus_choice",
            "option_a": {"label": "Move Mi"},
            "option_b": {"label": "Divini Procure"},
        }
    )
    assert payload.question == ""
    assert payload.option_a.probability == 0.5


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_business_simulation_rejects_invalid_kind() -> None:
    payload = _load("business_simulation.valid.json")
    payload["kind"] = "coin_flip"
    with pytest.raises(ValidationError):
        BusinessSimulation.model_validate(payload)


def test_decision_option_rejects_probability_over_one() -> None:
    with pytest.raises(ValidationError):
        SimulateDecisionInput.model_validate(
            {
                "kind": "focus_choice",
                "option_a": {"label": "A", "probability": 1.5},
                "option_b": {"label": "B"},
            }
        )
