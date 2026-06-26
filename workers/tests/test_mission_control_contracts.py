"""Cross-runtime lockstep tests for the Mission Control contracts.

Mirrors `packages/shared/src/contracts/mission-control.ts` (canonical Zod). The shared
fixtures must validate against the Pydantic models; if a fixture fails, the model is wrong,
not the fixture. Negative tests assert mirrored constraints reject invalid payloads.

Covers both the §28 read-model (MissionControlSnapshot / MissionControlAlert /
MissionControlPriority) and the earlier reading-snapshot placeholder.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    HealthReading,
    MissionControlAlert,
    MissionControlPriority,
    MissionControlReadingInput,
    MissionControlReadingSnapshot,
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


# --- §28 read-model ---------------------------------------------------------


def test_mission_control_snapshot_fixture_validates() -> None:
    snap = MissionControlSnapshot.model_validate(_load("mission_control_snapshot.valid.json"))
    assert snap.cash_runway_days == 45
    assert len(snap.top_priorities) == 1
    assert snap.top_priorities[0].rank == 1
    assert len(snap.critical_alerts) == 1
    assert snap.critical_alerts[0].severity == "critical"


def test_mission_control_alert_constructs() -> None:
    alert = MissionControlAlert.model_validate(
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "tenant_id": "00000000-0000-0000-0000-000000000001",
            "severity": "warn",
            "category": "cash",
            "title": "Cash runway is 45 days",
            "created_at": "2026-06-25T12:00:00.000Z",
        }
    )
    assert alert.status == "open"
    assert alert.routed_to == "mission_control"
    assert alert.business_id is None
    assert alert.requires_approval is False


def test_mission_control_priority_defaults() -> None:
    p = MissionControlPriority.model_validate(
        {"rank": 2, "title": "Unblock vendor contract", "category": "risk"}
    )
    assert p.why == ""


def test_rejects_bad_alert_severity() -> None:
    with pytest.raises(ValidationError):
        MissionControlAlert.model_validate(
            {
                "id": "33333333-3333-3333-3333-333333333333",
                "tenant_id": "00000000-0000-0000-0000-000000000001",
                "severity": "fatal",  # not info | warn | critical
                "category": "cash",
                "title": "x",
                "created_at": "2026-06-25T12:00:00.000Z",
            }
        )


def test_rejects_bad_alert_category() -> None:
    with pytest.raises(ValidationError):
        MissionControlAlert.model_validate(
            {
                "id": "33333333-3333-3333-3333-333333333333",
                "tenant_id": "00000000-0000-0000-0000-000000000001",
                "severity": "warn",
                "category": "marketing",  # not in the category enum
                "title": "x",
                "created_at": "2026-06-25T12:00:00.000Z",
            }
        )


def test_rejects_priority_rank_out_of_range() -> None:
    with pytest.raises(ValidationError):
        MissionControlPriority.model_validate(
            {"rank": 4, "title": "x", "category": "revenue"}
        )


def test_snapshot_forbids_extra_field() -> None:
    payload = _load("mission_control_snapshot.valid.json")
    payload["unexpected"] = "nope"
    with pytest.raises(ValidationError):
        MissionControlSnapshot.model_validate(payload)


# --- reading-snapshot placeholder -------------------------------------------


def test_mission_control_reading_snapshot_fixture_validates() -> None:
    MissionControlReadingSnapshot.model_validate(
        _load("mission_control_reading_snapshot.valid.json")
    )


def test_mission_control_reading_input_constructs() -> None:
    payload = MissionControlReadingInput.model_validate({})
    assert payload.enterprise_health == 0.5
    assert payload.agent_health == 1
    assert payload.roi is None


def test_rejects_health_reading_score_out_of_range() -> None:
    with pytest.raises(ValidationError):
        HealthReading.model_validate({"score": 1.5, "label": "Healthy"})


def test_rejects_enterprise_health_out_of_range() -> None:
    with pytest.raises(ValidationError):
        MissionControlReadingInput.model_validate({"enterprise_health": 2})
