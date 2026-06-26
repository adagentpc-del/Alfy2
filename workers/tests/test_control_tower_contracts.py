"""Cross-runtime lockstep tests for the Executive Control Tower contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/control-tower.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    ControlTowerSnapshot,
    TowerCash,
    TowerGoal,
    TowerRisk,
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


def test_control_tower_snapshot_fixture_validates() -> None:
    ControlTowerSnapshot.model_validate(_load("control_tower_snapshot.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_tower_cash_constructs() -> None:
    cash = TowerCash.model_validate(
        {
            "cash_on_hand_usd": 250000.0,
            "monthly_burn_usd": 40000.0,
            "monthly_inflow_usd": 55000.0,
        }
    )
    assert cash.runway_months is None


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_tower_goal_rejects_progress_over_one() -> None:
    with pytest.raises(ValidationError):
        TowerGoal.model_validate(
            {
                "name": "Reach $2M ARR",
                "status": "on_track",
                "progress": 1.5,
                "priority_level": "high",
            }
        )


def test_control_tower_snapshot_rejects_too_many_top_priorities() -> None:
    payload = _load("control_tower_snapshot.valid.json")
    payload["top_priorities"] = ["a", "b", "c", "d"]
    with pytest.raises(ValidationError):
        ControlTowerSnapshot.model_validate(payload)


def test_tower_risk_rejects_invalid_severity() -> None:
    with pytest.raises(ValidationError):
        TowerRisk.model_validate({"description": "Vendor lock-in", "severity": "critical"})
