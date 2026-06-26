"""Cross-runtime lockstep tests for the Goal Engine contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/goal.ts` (which is canonical); if a fixture fails here,
the model is wrong, not the fixture. Negative tests assert that constraints mirrored from
Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    CreateGoalInput,
    Goal,
    GoalPath,
    RiskItem,
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


def test_goal_fixture_validates() -> None:
    Goal.model_validate(_load("goal.valid.json"))


def test_create_goal_input_fixture_validates() -> None:
    CreateGoalInput.model_validate(_load("create_goal_input.valid.json"))


# --- Positive tests: inline-constructed models (no fixture) must validate ---


def test_goal_path_constructs() -> None:
    GoalPath.model_validate(
        {
            "kind": "fastest",
            "summary": "Convert one-off customers to retainers.",
            "steps": ["List customers", "Send offers", "Close"],
            "rationale": "Reuses existing demand.",
            "estimated_days": 30,
            "risk_level": "medium",
        }
    )


def test_risk_item_constructs() -> None:
    RiskItem.model_validate(
        {
            "description": "Sales bandwidth too thin",
            "likelihood": "high",
            "impact": "high",
            "mitigation": "Automate follow-up; delegate outreach",
        }
    )


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_goal_rejects_invalid_type() -> None:
    payload = _load("goal.valid.json")
    payload["type"] = "spiritual"
    with pytest.raises(ValidationError):
        Goal.model_validate(payload)


def test_goal_path_rejects_empty_steps() -> None:
    payload = {
        "kind": "fastest",
        "summary": "A path.",
        "steps": [],
        "rationale": "Because.",
        "estimated_days": 10,
    }
    with pytest.raises(ValidationError):
        GoalPath.model_validate(payload)


def test_goal_rejects_zero_version() -> None:
    payload = _load("goal.valid.json")
    payload["version"] = 0
    with pytest.raises(ValidationError):
        Goal.model_validate(payload)


def test_weekly_plan_item_rejects_zero_week() -> None:
    payload = _load("goal.valid.json")
    payload["plan"]["weekly_plan"][0]["week"] = 0
    with pytest.raises(ValidationError):
        Goal.model_validate(payload)
