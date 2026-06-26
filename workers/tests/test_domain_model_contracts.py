"""Cross-runtime lockstep tests for the Domain Operating Model contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/domain-model.ts` (canonical). If a fixture fails here, the
model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    DomainEscalationRule,
    DomainKpi,
    DomainModel,
    DomainWorkflow,
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


def test_domain_model_fixture_validates() -> None:
    DomainModel.model_validate(_load("domain_model.valid.json"))


# --- Positive: inline-constructed models must validate ---


def test_domain_escalation_rule_constructs() -> None:
    rule = DomainEscalationRule.model_validate(
        {
            "condition": "deal value over $50k",
            "action": "route to founder for sign-off",
        }
    )
    assert rule.escalate_to == "owner"


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_domain_model_rejects_invalid_domain() -> None:
    payload = _load("domain_model.valid.json")
    payload["domain"] = "engineering"
    with pytest.raises(ValidationError):
        DomainModel.model_validate(payload)


def test_domain_kpi_rejects_missing_name() -> None:
    with pytest.raises(ValidationError):
        DomainKpi.model_validate({"target": 100.0})


def test_domain_workflow_rejects_missing_purpose() -> None:
    with pytest.raises(ValidationError):
        DomainWorkflow.model_validate({"name": "Weekly pipeline review"})
