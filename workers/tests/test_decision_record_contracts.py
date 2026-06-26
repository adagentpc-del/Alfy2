"""Contract tests for the Advisory Decision Engine mirror (decision-record.ts, §35).

Validate a valid instance + defaults, that a bad enum is rejected, and that extra fields are
forbidden. The Zod schema (decision-record.ts) is canonical; if a valid payload fails here, the
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
        "title": "Raise the Pro plan to $99/mo",
        "decision_type": "pricing",
        "reversibility": "two_way_door",
        "lens_analysis": [
            {"lens": "offer_acquisition", "reading": "Stronger anchor", "score": 7},
        ],
        "created_at": NOW.isoformat(),
    }


def test_decision_record_valid_instance_and_defaults() -> None:
    rec = m.DecisionRecord.model_validate(_valid())
    assert rec.business_id is None
    assert rec.summary == ""
    assert rec.risks == []
    assert rec.assumptions == []
    assert rec.required_data == []
    assert rec.recommendation == ""
    assert rec.approval_required is True
    assert rec.status == "open"
    assert rec.updated_at is None
    assert rec.decided_at is None
    # The lens reading's own default (caution) applies.
    assert rec.lens_analysis[0].caution == ""
    assert m.DecisionRecord.model_validate(rec.model_dump(mode="json")) == rec


def test_decision_record_rejects_bad_decision_type() -> None:
    payload = _valid()
    payload["decision_type"] = "teleport"
    with pytest.raises(ValidationError):
        m.DecisionRecord.model_validate(payload)


def test_decision_record_rejects_bad_reversibility() -> None:
    payload = _valid()
    payload["reversibility"] = "revolving_door"
    with pytest.raises(ValidationError):
        m.DecisionRecord.model_validate(payload)


def test_decision_record_rejects_bad_lens() -> None:
    payload = _valid()
    payload["lens_analysis"] = [{"lens": "vibes", "reading": "x", "score": 5}]
    with pytest.raises(ValidationError):
        m.DecisionRecord.model_validate(payload)


def test_decision_record_forbids_extra_field() -> None:
    payload = _valid()
    payload["surprise"] = "nope"
    with pytest.raises(ValidationError):
        m.DecisionRecord.model_validate(payload)
