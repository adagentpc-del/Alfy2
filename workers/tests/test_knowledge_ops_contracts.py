"""Contract tests for the Knowledge Ops mirrors (knowledge-ops.ts)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_knowledge_source_defaults() -> None:
    src = m.KnowledgeSource(
        id=uuid.uuid4(), tenant_id=T, source_name="Hormozi YT", kind="youtube",
        created_at=NOW,
    )
    assert src.status == "added"
    assert src.expert == ""
    assert src.summarized is False
    assert src.updated_at is None
    assert m.KnowledgeSource.model_validate(src.model_dump()) == src


def test_knowledge_source_bad_kind() -> None:
    with pytest.raises(ValidationError):
        m.KnowledgeSource(
            id=uuid.uuid4(), tenant_id=T, source_name="x",
            kind="tiktok",  # type: ignore[arg-type]
            created_at=NOW,
        )


def test_knowledge_source_rejects_extra_field() -> None:
    with pytest.raises(ValidationError):
        m.KnowledgeSource(
            id=uuid.uuid4(), tenant_id=T, source_name="x", kind="podcast",
            created_at=NOW, surprise=42,  # type: ignore[call-arg]
        )


def test_operator_digest_and_adaptation_filter() -> None:
    item = m.OperatorDigestItem(
        id=uuid.uuid4(), tenant_id=T, week="2026-W26",
        principle="Sell the vacation, not the flight", created_at=NOW,
    )
    assert item.effort == "medium"
    assert item.upside == "medium"
    assert item.surfaced is False
    assert m.OperatorDigestItem.model_validate(item.model_dump()) == item

    res = m.AdaptationFilterResult(
        id=uuid.uuid4(), tenant_id=T, principle="give before you ask",
        business_key="move_mi", created_at=NOW,
    )
    assert res.passed is False
    assert m.AdaptationFilterResult.model_validate(res.model_dump()) == res


def test_taxonomy_entry_defaults_and_bad_discipline() -> None:
    entry = m.KnowledgeTaxonomyEntry(
        id=uuid.uuid4(), tenant_id=T, insight="anchor high",
        discipline="pricing", company_stage="scaling", business_model="saas",
        created_at=NOW,
    )
    assert entry.confidence == 0.5
    assert entry.risk_level == "medium"
    assert m.KnowledgeTaxonomyEntry.model_validate(entry.model_dump()) == entry

    with pytest.raises(ValidationError):
        m.KnowledgeTaxonomyEntry(
            id=uuid.uuid4(), tenant_id=T, insight="x",
            discipline="vibes",  # type: ignore[arg-type]
            company_stage="idea", business_model="saas", created_at=NOW,
        )


def test_scenario_and_experiment_roundtrip() -> None:
    scenario = m.KnowledgeScenario(
        id=uuid.uuid4(), tenant_id=T, strategy="launch paid tier",
        business_key="move_mi",
        scenarios=[m.ScenarioOption(kind="fastest_cash", kpis=["mrr"])],
        created_at=NOW,
    )
    assert scenario.scenarios[0].effort == "medium"
    assert m.KnowledgeScenario.model_validate(scenario.model_dump()) == scenario

    exp = m.KnowledgeExperiment(
        id=uuid.uuid4(), tenant_id=T, hypothesis="raising price lifts LTV",
        business_key="move_mi", created_at=NOW,
    )
    assert exp.status == "untested"
    assert exp.updated_at is None
    assert m.KnowledgeExperiment.model_validate(exp.model_dump()) == exp

    with pytest.raises(ValidationError):
        m.ScenarioOption(kind="slowest_cash")  # type: ignore[arg-type]
