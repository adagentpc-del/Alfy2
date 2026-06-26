"""Cross-runtime lockstep tests for the Agent Evaluation Lab contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/agent-eval.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AgentEvaluation, RegisterAgentEvalInput


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


def test_agent_evaluation_fixture_validates() -> None:
    AgentEvaluation.model_validate(_load("agent_evaluation.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_register_agent_eval_input_constructs() -> None:
    payload = RegisterAgentEvalInput.model_validate(
        {
            "agent_key": "sales.followup",
            "test_cases": [{"name": "drafts a follow-up"}],
        }
    )
    assert payload.pass_threshold == 0.8
    assert payload.test_cases[0].is_failure_case is False


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_agent_evaluation_rejects_invalid_stage() -> None:
    payload = _load("agent_evaluation.valid.json")
    payload["stage"] = "beta"
    with pytest.raises(ValidationError):
        AgentEvaluation.model_validate(payload)


def test_agent_evaluation_rejects_threshold_over_one() -> None:
    payload = _load("agent_evaluation.valid.json")
    payload["pass_threshold"] = 1.5
    with pytest.raises(ValidationError):
        AgentEvaluation.model_validate(payload)
