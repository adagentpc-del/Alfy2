"""Contract tests for the Capital Allocation mirror (capital-allocation.ts).

Validate valid instances + defaults, that bad bucket/mode values are rejected, and that extra fields
are forbidden. The Zod schema (capital-allocation.ts) is canonical; if a valid payload fails here, the
mirror is wrong, not the contract.

HARD RULE (Constitution / Part I §13): Alfie NEVER moves money — an allocation is recommended=True,
approved=False. This test pins those defaults.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()
B = uuid.uuid4()


def _account() -> dict:
    return {
        "id": str(uuid.uuid4()),
        "tenant_id": str(T),
        "business_id": str(B),
        "bucket": "operating",
        "target_pct": 0.3,
        "created_at": NOW.isoformat(),
    }


def _allocation() -> dict:
    return {
        "id": str(uuid.uuid4()),
        "tenant_id": str(T),
        "business_id": str(B),
        "inflow_usd": 1000.0,
        "split": {"operating": 300.0, "taxes": 150.0},
        "mode": "profit_first",
        "created_at": NOW.isoformat(),
    }


def _runway() -> dict:
    return {
        "id": str(uuid.uuid4()),
        "tenant_id": str(T),
        "business_id": str(B),
        "as_of": NOW.isoformat(),
        "cash_usd": 5000.0,
        "monthly_burn_usd": 6000.0,
        "runway_days": 25,
        "min_reserve_usd": 10000.0,
        "mode": "emergency",
        "created_at": NOW.isoformat(),
    }


def test_capital_account_valid_and_defaults() -> None:
    acc = m.CapitalAccount.model_validate(_account())
    assert acc.balance == 0
    assert acc.updated_at is None
    assert m.CapitalAccount.model_validate(acc.model_dump(mode="json")) == acc


def test_capital_allocation_recommend_only_defaults() -> None:
    alloc = m.CapitalAllocation.model_validate(_allocation())
    # NON-NEGOTIABLE: a fresh allocation is a recommendation, never executed.
    assert alloc.recommended is True
    assert alloc.approved is False
    assert m.CapitalAllocation.model_validate(alloc.model_dump(mode="json")) == alloc


def test_capital_runway_valid_instance() -> None:
    rw = m.CapitalRunway.model_validate(_runway())
    assert rw.mode == "emergency"
    assert m.CapitalRunway.model_validate(rw.model_dump(mode="json")) == rw


def test_capital_account_rejects_bad_bucket() -> None:
    payload = _account()
    payload["bucket"] = "crypto"
    with pytest.raises(ValidationError):
        m.CapitalAccount.model_validate(payload)


def test_capital_allocation_rejects_bad_mode() -> None:
    payload = _allocation()
    payload["mode"] = "yolo"
    with pytest.raises(ValidationError):
        m.CapitalAllocation.model_validate(payload)


def test_capital_runway_forbids_extra_field() -> None:
    payload = _runway()
    payload["surprise"] = "nope"
    with pytest.raises(ValidationError):
        m.CapitalRunway.model_validate(payload)
