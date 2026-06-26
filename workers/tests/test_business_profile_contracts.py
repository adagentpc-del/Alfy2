"""Contract tests for the Business Operating Profile + Context Stack mirrors (business-profile.ts)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_profile_defaults_and_offers() -> None:
    p = m.BusinessOperatingProfile(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi",
        offers=[m.ProfileOffer(name="Local move")], created_at=NOW,
    )
    assert p.tier == "tier_1"
    assert p.status == "active"
    assert p.offers[0].name == "Local move"
    assert m.BusinessOperatingProfile.model_validate(p.model_dump()) == p
    with pytest.raises(ValidationError):
        m.BusinessOperatingProfile(id=uuid.uuid4(), tenant_id=T, business_key="x", tier="platinum", created_at=NOW)  # type: ignore[arg-type]


def test_context_stack_layer_enum() -> None:
    entry = m.ContextStackEntry(layer="security_compliance", content=["no secrets in public copy"])
    assert entry.layer == "security_compliance"
    stack = m.ContextStack(
        id=uuid.uuid4(), tenant_id=T, business_key="stratalogic", task="draft a post",
        layers=[entry], compliance_caution="health caution + disclaimers", created_at=NOW,
    )
    assert stack.layers[0].layer == "security_compliance"
    assert m.ContextStack.model_validate(stack.model_dump()) == stack
    with pytest.raises(ValidationError):
        m.ContextStackEntry(layer="marketing_vibes", content=[])  # type: ignore[arg-type]
