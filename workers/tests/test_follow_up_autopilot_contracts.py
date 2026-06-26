"""Cross-runtime lockstep tests for the updated Follow-Up autopilot contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/follow-up.ts` (canonical). These cover the escalation and
richer-signal additions. If a fixture fails here, the model is wrong, not the fixture.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import FollowUp, FollowUpSignal


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- Positive: shared fixture must validate (escalated status + escalation_reason) ---


def test_follow_up_escalated_fixture_validates() -> None:
    follow_up = FollowUp.model_validate(_load("follow_up_escalated.valid.json"))
    assert follow_up.status == "escalated"
    assert follow_up.escalation_reason


# --- Positive: inline-constructed signals must validate ---


def test_follow_up_signal_meeting_booked() -> None:
    signal = FollowUpSignal.model_validate({"meeting_booked": True})
    assert signal.meeting_booked is True
    assert signal.deal_closed is False
    assert signal.needs_human is False
    assert signal.escalation_reason == ""


def test_follow_up_signal_needs_human() -> None:
    signal = FollowUpSignal.model_validate(
        {"needs_human": True, "escalation_reason": "Custom contract terms requested."}
    )
    assert signal.needs_human is True
    assert signal.escalation_reason == "Custom contract terms requested."


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_follow_up_rejects_invalid_stop_reason() -> None:
    payload = _load("follow_up_escalated.valid.json")
    payload["stop_reason"] = "ghosted"
    with pytest.raises(ValidationError):
        FollowUp.model_validate(payload)
