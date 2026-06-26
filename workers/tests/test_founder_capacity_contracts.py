"""Contract tests for the Founder Capacity mirror (founder-capacity.ts).

Validate a valid instance + defaults, that a bad work mode is rejected, and that extra fields are
forbidden. The Zod schema (founder-capacity.ts) is canonical; if a valid payload fails here, the
mirror is wrong, not the contract.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def _valid() -> dict:
    return {
        "id": str(uuid.uuid4()),
        "tenant_id": str(T),
        "as_of": NOW.isoformat(),
        "energy": 8,
        "sleep_hours": 7.5,
        "stress": 2,
        "focus": 9,
        "capacity_score": 82,
        "recommended_mode": "high_capacity",
        "created_at": NOW.isoformat(),
    }


def test_founder_capacity_snapshot_valid_instance_and_defaults() -> None:
    snap = m.FounderCapacitySnapshot.model_validate(_valid())
    assert snap.meeting_load is None
    assert snap.decision_fatigue is None
    assert snap.context_switching is None
    assert snap.emotional_load is None
    assert snap.urgency is None
    assert snap.build_intensity is None
    assert snap.health_constraints == []
    assert snap.do_not_interrupt is False
    assert m.FounderCapacitySnapshot.model_validate(snap.model_dump(mode="json")) == snap


def test_founder_capacity_snapshot_rejects_bad_mode() -> None:
    payload = _valid()
    payload["recommended_mode"] = "turbo"
    with pytest.raises(ValidationError):
        m.FounderCapacitySnapshot.model_validate(payload)


def test_founder_capacity_snapshot_forbids_extra_field() -> None:
    payload = _valid()
    payload["surprise"] = "nope"
    with pytest.raises(ValidationError):
        m.FounderCapacitySnapshot.model_validate(payload)
