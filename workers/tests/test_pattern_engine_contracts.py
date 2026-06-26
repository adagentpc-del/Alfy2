"""Cross-runtime lockstep tests for the Pattern Engine contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/pattern-engine.ts` (which are canonical); if a fixture fails
here, the model is wrong, not the fixture. Negative tests assert that constraints mirrored
from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    BehaviorObservation,
    Bottleneck,
    Pattern,
    PatternReport,
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


# --- Positive tests: shared fixtures must validate against the mirrored models ---


def test_behavior_observation_fixture_validates() -> None:
    BehaviorObservation.model_validate(_load("behavior_observation.valid.json"))


def test_pattern_report_fixture_validates() -> None:
    # The report's window uses the JSON key "from"; the AnalysisWindow alias must handle it.
    PatternReport.model_validate(_load("pattern_report.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_pattern_rejects_strength_above_one() -> None:
    with pytest.raises(ValidationError):
        Pattern.model_validate(
            {
                "signal": "performance",
                "summary": "too strong",
                "direction": "positive",
                "strength": 1.5,
                "evidence_count": 3,
                "detail": "strength is out of the 0..1 bound",
            }
        )


def test_behavior_observation_rejects_invalid_signal() -> None:
    with pytest.raises(ValidationError):
        BehaviorObservation.model_validate(
            {
                "at": "2026-06-20T09:00:00.000Z",
                "signal": "vibes",
            }
        )


def test_bottleneck_rejects_invalid_severity() -> None:
    with pytest.raises(ValidationError):
        Bottleneck.model_validate(
            {
                "area": "Follow-up",
                "severity": "catastrophic",
                "description": "slips past due date",
                "impact": "warm leads go cold",
                "evidence_count": 5,
            }
        )
