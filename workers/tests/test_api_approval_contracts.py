"""Contract tests for the API Approval Gate mirror (api-approval.ts).

Validate a valid instance, defaults, that a bad enum is rejected, and that extra fields are
forbidden. The Zod schema (api-approval.ts) is canonical; if a valid payload fails here, the
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
        "action_class": "move_money",
        "method": "POST",
        "route": "/v1/payouts",
        "summary": "Send a $2,000 vendor payout.",
        "risk": "critical",
        "requires_approval": True,
        "requested_by": "agent:finance",
        "created_at": NOW.isoformat(),
    }


def test_api_approval_request_valid_instance_and_defaults() -> None:
    req = m.ApiApprovalRequest.model_validate(_valid())
    assert req.business_id is None
    assert req.payload == {}
    assert req.status == "pending"
    assert req.decided_by is None
    assert req.decision_reason == ""
    assert req.decided_at is None
    assert m.ApiApprovalRequest.model_validate(req.model_dump(mode="json")) == req


def test_api_approval_request_rejects_bad_action_class() -> None:
    payload = _valid()
    payload["action_class"] = "teleport_funds"
    with pytest.raises(ValidationError):
        m.ApiApprovalRequest.model_validate(payload)


def test_api_approval_request_rejects_bad_status() -> None:
    payload = _valid()
    payload["status"] = "maybe"
    with pytest.raises(ValidationError):
        m.ApiApprovalRequest.model_validate(payload)


def test_api_approval_request_forbids_extra_field() -> None:
    payload = _valid()
    payload["surprise"] = "nope"
    with pytest.raises(ValidationError):
        m.ApiApprovalRequest.model_validate(payload)
