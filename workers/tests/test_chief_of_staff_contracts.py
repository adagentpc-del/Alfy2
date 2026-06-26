"""Cross-runtime lockstep tests for the Chief of Staff briefing contracts.

Load the canonical briefing fixture in `packages/shared/fixtures/` and construct the
matching Pydantic model. These models mirror the Zod schemas in
`packages/shared/src/contracts/chief-of-staff.ts` (which are canonical); if a fixture fails
here, the model is wrong, not the fixture. Negative tests assert that constraints mirrored
from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    BriefingItem,
    ChiefOfStaffBriefing,
    DashboardSummary,
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


def test_chief_of_staff_briefing_fixture_validates() -> None:
    ChiefOfStaffBriefing.model_validate(_load("chief_of_staff_briefing.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_briefing_item_rejects_score_above_one() -> None:
    with pytest.raises(ValidationError):
        BriefingItem.model_validate(
            {"title": "x", "priority_level": "high", "score": 2.0}
        )


def test_dashboard_summary_rejects_negative_critical_count() -> None:
    data = _load("chief_of_staff_briefing.valid.json")["dashboard"]
    data["critical_count"] = -1
    with pytest.raises(ValidationError):
        DashboardSummary.model_validate(data)
