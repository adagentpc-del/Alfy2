"""Cross-runtime lockstep tests for the AI Center of Excellence contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/ai-coe.ts` (canonical). If a fixture fails here, the
model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    ApprovedStandard,
    ComplianceResult,
    ComplianceTarget,
    Violation,
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


# --- Positive: shared fixture must validate ---


def test_approved_standard_fixture_validates() -> None:
    ApprovedStandard.model_validate(_load("approved_standard.valid.json"))


# --- Positive: inline-constructed models must validate ---


def test_compliance_target_and_violation_construct() -> None:
    target = ComplianceTarget.model_validate(
        {
            "kind": "agent",
            "name": "billing.collections",
        }
    )
    assert target.kind == "agent"
    assert target.est_cost_usd == 0
    assert target.model is None

    violation = Violation.model_validate(
        {
            "standard_kind": "cost_control",
            "rule": "cost:max",
            "severity": "warning",
            "message": "Estimated cost exceeds the cap.",
        }
    )
    assert violation.severity == "warning"


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_approved_standard_rejects_invalid_kind() -> None:
    payload = _load("approved_standard.valid.json")
    payload["kind"] = "made_up"
    with pytest.raises(ValidationError):
        ApprovedStandard.model_validate(payload)


def test_approved_standard_rejects_invalid_status() -> None:
    payload = _load("approved_standard.valid.json")
    payload["status"] = "pending"
    with pytest.raises(ValidationError):
        ApprovedStandard.model_validate(payload)


def test_compliance_result_rejects_score_above_one() -> None:
    with pytest.raises(ValidationError):
        ComplianceResult.model_validate(
            {
                "target_kind": "workflow",
                "target_name": "nightly-sync",
                "passed": True,
                "score": 1.5,
                "created_at": "2026-06-25T12:00:00Z",
            }
        )
