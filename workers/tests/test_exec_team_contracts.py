"""Contract tests for the executive-team & life Pydantic mirrors.

Covers voice-persona, personal-executive-model, meeting-prep, relationship-capital, venture-studio,
alyssa-pattern-mirror, teach-framework, and life-dashboard — validate, round-trip, forbid drift.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 25, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_voice_persona_layer_only_pinned() -> None:
    p = m.VoicePersona(id=uuid.uuid4(), tenant_id=T, name="Vivienne", created_at=NOW, updated_at=NOW)
    assert p.is_voice_layer_only is True
    assert p.accent == "British (female)"
    assert m.VoicePersona.model_validate(p.model_dump()) == p


def test_pem_amplifies_not_imitates() -> None:
    pem = m.PersonalExecutiveModel(id=uuid.uuid4(), tenant_id=T, created_at=NOW, updated_at=NOW)
    assert pem.amplifies_not_imitates is True
    ex = m.PemExplanation(why_preferred="aligns", confidence=0.7)
    assert ex.evidence_missing == []
    with pytest.raises(ValidationError):
        m.ObservePemInput(dimension="not_a_dim", statement="x", source="observed_outcome")  # type: ignore[arg-type]


def test_meeting_dossier_and_recap() -> None:
    d = m.MeetingDossier(id=uuid.uuid4(), tenant_id=T, title="Investor call", created_at=NOW)
    assert d.talking_points == []
    r = m.MeetingRecap(id=uuid.uuid4(), tenant_id=T, title="Investor call", created_at=NOW)
    assert r.next_actions == []


def test_relationship_record_and_opportunity() -> None:
    rec = m.RelationshipCapitalRecord(id=uuid.uuid4(), tenant_id=T, person_id="p1", name="Dan", kind="partner", created_at=NOW, updated_at=NOW)
    assert rec.health == 0.5
    op = m.RelationshipOpportunity(move="reconnect", reason="gone cold")
    assert op.priority == 0.5
    with pytest.raises(ValidationError):
        m.RelationshipOpportunity(move="ghost", reason="x")  # type: ignore[arg-type]


def test_venture_session_defaults() -> None:
    s = m.VentureStudioSession(id=uuid.uuid4(), tenant_id=T, idea="Oralia", created_at=NOW, updated_at=NOW)
    assert s.current_stage == "discovery"
    assert s.inherits_operating_standards is True
    assert s.awaiting_launch_approval is True


def test_pattern_mirror_and_framework() -> None:
    obs = m.ThinkingPatternObservation(id=uuid.uuid4(), tenant_id=T, kind="recurring_theme", observation="bundles ideas", amplification="build_framework", created_at=NOW)
    assert obs.occurrences == 1
    fw = m.TaughtFramework(id=uuid.uuid4(), tenant_id=T, name="The X Framework", problem_type="x", explanation="how", created_at=NOW)
    assert fw.strength == 0.5
    with pytest.raises(ValidationError):
        m.FrameworkArtifact(kind="tweet", content="x")  # type: ignore[arg-type]


def test_life_dashboard_message_pinned() -> None:
    d = m.LifeDashboard(summary="good week")
    assert d.message == "The businesses exist to support life, not replace it."
    with pytest.raises(ValidationError):
        m.BuildLifeDashboardInput(freedom_index=150)  # 0..100
