"""Cross-runtime lockstep tests for the Simulation Engine contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/simulation.ts` (canonical). If a fixture fails here, the
model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    ScenarioCase,
    SimRisk,
    SimulationInput,
    SimulationResult,
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


def test_simulation_result_fixture_validates() -> None:
    SimulationResult.model_validate(_load("simulation_result.valid.json"))


# --- Positive: inline-constructed models must validate ---


def test_scenario_case_constructs() -> None:
    case = ScenarioCase.model_validate(
        {
            "label": "likely",
            "assumptions": ["Automation captures 70%"],
            "projection": {"net_savings_usd": 26000.0},
            "narrative": "Automation covers most follow-ups.",
            "probability": 0.5,
        }
    )
    assert case.label == "likely"
    assert case.probability == 0.5


def test_sim_risk_constructs() -> None:
    risk = SimRisk.model_validate(
        {
            "description": "Automation quality may erode trust.",
            "likelihood": "medium",
            "impact": "high",
            "mitigation": "Keep human approval on early drafts.",
        }
    )
    assert risk.likelihood == "medium"
    assert risk.impact == "high"


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_simulation_result_rejects_invalid_kind() -> None:
    payload = _load("simulation_result.valid.json")
    payload["kind"] = "teleport"
    with pytest.raises(ValidationError):
        SimulationResult.model_validate(payload)


def test_scenario_case_rejects_probability_above_one() -> None:
    with pytest.raises(ValidationError):
        ScenarioCase.model_validate(
            {
                "label": "best",
                "narrative": "Everything goes well.",
                "probability": 1.5,
            }
        )


def test_simulation_input_rejects_zero_horizon() -> None:
    with pytest.raises(ValidationError):
        SimulationInput.model_validate(
            {
                "kind": "revenue_path",
                "name": "Revenue ramp",
                "horizon_days": 0,
            }
        )
