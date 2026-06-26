"""Cross-runtime lockstep tests for the Mission Control contracts.

Mirrors `packages/shared/src/contracts/mission-control.ts` (canonical Zod). The shared
fixture must validate against the Pydantic models; if it fails, the model is wrong, not
the fixture. Negative tests assert mirrored constraints reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    HealthReading,
    MissionControlInput,
    MissionControlSnapshot,
)


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_mission_control_snapshot_fixture_validates() -> None:
    MissionControlSnapshot.model_validate(_load("mission_control_snapshot.valid.json"))


def test_mission_control_input_constructs() -> None:
    payload = MissionControlInput.model_validate({})
    assert payload.enterprise_health == 0.5
    assert payload.agent_health == 1
    assert payload.roi is None


def test_rejects_health_reading_score_out_of_range() -> None:
    with pytest.raises(ValidationError):
        HealthReading.model_validate({"score": 1.5, "label": "Healthy"})


def test_rejects_enterprise_health_out_of_range() -> None:
    with pytest.raises(ValidationError):
        MissionControlInput.model_validate({"enterprise_health": 2})
