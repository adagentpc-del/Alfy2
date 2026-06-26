"""Contract tests for the Connections layer Pydantic mirrors (connections.ts).

Covers connector definitions, scoped connections, and resolution — validate, round-trip, forbid drift.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 25, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_connector_definition_defaults() -> None:
    d = m.ConnectorDefinition(
        id=uuid.uuid4(), tenant_id=T, provider="resend", display_name="Resend", category="email",
        auth_kind="api_key", created_at=NOW, updated_at=NOW,
    )
    assert d.enabled is True
    assert d.risk_level == "low"
    assert m.ConnectorDefinition.model_validate(d.model_dump()) == d
    with pytest.raises(ValidationError):
        m.RegisterConnectorInput(provider="x", display_name="X", category="email", auth_kind="carrier_pigeon")  # type: ignore[arg-type]


def test_connection_scope_and_status() -> None:
    c = m.Connection(
        id=uuid.uuid4(), tenant_id=T, scope="business", business_id=uuid.uuid4(), provider="resend",
        created_at=NOW, updated_at=NOW,
    )
    assert c.scope == "business"
    assert c.status == "not_connected"
    assert c.secret_refs == []
    with pytest.raises(ValidationError):
        m.Connection(id=uuid.uuid4(), tenant_id=T, scope="planet", provider="x", created_at=NOW, updated_at=NOW)  # type: ignore[arg-type]


def test_connection_resolution_enum() -> None:
    r = m.ConnectionResolution(provider="resend", resolved_from="master", status="connected", can_use=True, reason="inherited")
    assert r.resolved_from == "master"
    assert r.can_use is True
    with pytest.raises(ValidationError):
        m.ConnectionResolution(provider="resend", resolved_from="galaxy", status="connected", can_use=True, reason="x")  # type: ignore[arg-type]
