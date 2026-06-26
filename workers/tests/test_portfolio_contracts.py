"""Cross-runtime lockstep tests for the Strategic Portfolio Optimizer contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/portfolio.ts` (canonical). If a fixture fails here, the
model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    BusinessAssessment,
    PortfolioMetrics,
    PortfolioReport,
)


def _repo_root() -> Path:
    """Walk up from this test file until we find the repo root (has packages/shared/fixtures)."""
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


_METRICS = {
    "revenue_potential": 0.8,
    "speed_to_cash": 0.7,
    "effort_required": 0.4,
    "stress_cost": 0.3,
    "strategic_value": 0.7,
    "current_traction": 0.6,
    "operational_drag": 0.3,
    "capital_required": 0.2,
    "team_dependency": 0.4,
    "monetization_path": 0.8,
}


# --- Positive: shared fixture must validate ---


def test_portfolio_report_fixture_validates() -> None:
    PortfolioReport.model_validate(_load("portfolio_report.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_business_assessment_constructs() -> None:
    assessment = BusinessAssessment.model_validate(
        {
            "business_name": "Move Mi",
            "metrics": _METRICS,
            "score": 0.72,
            "recommendation": "focus_now",
            "rationale": "High potential, fast to cash.",
        }
    )
    assert assessment.recommendation == "focus_now"


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_business_assessment_rejects_invalid_recommendation() -> None:
    with pytest.raises(ValidationError):
        BusinessAssessment.model_validate(
            {
                "business_name": "Move Mi",
                "metrics": _METRICS,
                "score": 0.5,
                "recommendation": "sell_everything",
                "rationale": "Nope.",
            }
        )


def test_portfolio_metrics_rejects_out_of_bounds() -> None:
    bad = dict(_METRICS)
    bad["revenue_potential"] = 1.5
    with pytest.raises(ValidationError):
        PortfolioMetrics.model_validate(bad)


def test_portfolio_metrics_rejects_missing_field() -> None:
    incomplete = dict(_METRICS)
    del incomplete["speed_to_cash"]
    with pytest.raises(ValidationError):
        PortfolioMetrics.model_validate(incomplete)
