"""Cross-runtime lockstep tests for the Alfy² meta-layer contracts.

Mirrors the canonical Zod contracts:
`packages/shared/src/contracts/{rnd,acquisition,flight-deck,freedom-index,life-roi,
never-again,self-improvement,operating-rhythm,exec-operating-manual,infinite-loop,
ultimate-design-rule}.ts`.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    AcquisitionEvaluation,
    DesignRuleVerdict,
    ExecutiveOperatingManualDoc,
    FlightDeck,
    FreedomIndexReading,
    LifeRoiAssessment,
    LoopPlacement,
    NeverAgainSolution,
    OperatingRhythmAgenda,
    RndDiscovery,
    SelfImprovementReport,
)


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_rnd_discovery_fixture_validates() -> None:
    payload = _load("rnd_discovery.valid.json")
    model = RndDiscovery.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.domain == payload["domain"]
    assert model.disposition == payload["disposition"]
    assert model.high_confidence == payload["high_confidence"]


def test_rnd_discovery_rejects_invalid_disposition() -> None:
    payload = _load("rnd_discovery.valid.json")
    payload["disposition"] = "delete"
    with pytest.raises(ValidationError):
        RndDiscovery.model_validate(payload)


def test_acquisition_evaluation_fixture_validates() -> None:
    payload = _load("acquisition_evaluation.valid.json")
    model = AcquisitionEvaluation.model_validate(payload)
    assert model.recommendation == payload["recommendation"]
    assert len(model.verdicts) == len(payload["verdicts"])
    assert model.verdicts[0].strategy == payload["verdicts"][0]["strategy"]


def test_flight_deck_fixture_validates() -> None:
    payload = _load("flight_deck.valid.json")
    model = FlightDeck.model_validate(payload)
    assert model.suppressed_count == payload["suppressed_count"]
    assert model.next_highest_leverage_action == payload["next_highest_leverage_action"]
    assert model.displayed[0].kind == payload["displayed"][0]["kind"]


def test_freedom_index_reading_fixture_validates() -> None:
    payload = _load("freedom_index_reading.valid.json")
    model = FreedomIndexReading.model_validate(payload)
    assert model.score == payload["score"]
    assert model.trend == payload["trend"]
    assert model.biggest_bottleneck == payload["biggest_bottleneck"]


def test_freedom_index_reading_rejects_out_of_range_score() -> None:
    payload = _load("freedom_index_reading.valid.json")
    payload["score"] = 101
    with pytest.raises(ValidationError):
        FreedomIndexReading.model_validate(payload)


def test_life_roi_assessment_fixture_validates() -> None:
    payload = _load("life_roi_assessment.valid.json")
    model = LifeRoiAssessment.model_validate(payload)
    assert model.workflow == payload["workflow"]
    assert model.life_roi_score == payload["life_roi_score"]
    assert model.summary == payload["summary"]


def test_never_again_solution_fixture_validates() -> None:
    payload = _load("never_again_solution.valid.json")
    model = NeverAgainSolution.model_validate(payload)
    assert model.trigger == payload["trigger"]
    assert model.permanent_solution == payload["permanent_solution"]
    assert model.priority == payload["priority"]


def test_self_improvement_report_fixture_validates() -> None:
    payload = _load("self_improvement_report.valid.json")
    model = SelfImprovementReport.model_validate(payload)
    assert model.period_label == payload["period_label"]
    assert model.complexity_delta == payload["complexity_delta"]
    assert len(model.findings) == len(payload["findings"])


def test_operating_rhythm_agenda_fixture_validates() -> None:
    payload = _load("operating_rhythm_agenda.valid.json")
    model = OperatingRhythmAgenda.model_validate(payload)
    assert model.cadence == payload["cadence"]
    assert model.agenda == payload["agenda"]
    assert model.generates.lessons == payload["generates"]["lessons"]


def test_executive_operating_manual_doc_fixture_validates() -> None:
    payload = _load("executive_operating_manual_doc.valid.json")
    model = ExecutiveOperatingManualDoc.model_validate(payload)
    assert model.fully_current == payload["fully_current"]
    assert list(model.stale_domains) == payload["stale_domains"]
    assert len(model.sections) == len(payload["sections"])


def test_loop_placement_fixture_validates() -> None:
    payload = _load("loop_placement.valid.json")
    model = LoopPlacement.model_validate(payload)
    assert model.module == payload["module"]
    assert model.primary_stage == payload["primary_stage"]
    assert model.feeds_stage == payload["feeds_stage"]
    assert model.in_loop == payload["in_loop"]


def test_design_rule_verdict_fixture_validates() -> None:
    payload = _load("design_rule_verdict.valid.json")
    model = DesignRuleVerdict.model_validate(payload)
    assert model.feature == payload["feature"]
    assert model.belongs == payload["belongs"]
    assert list(model.satisfied) == payload["satisfied"]
