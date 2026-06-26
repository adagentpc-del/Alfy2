"""Cross-runtime lockstep tests for the Agent Factory contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/agent-factory.ts` (which are canonical); if a fixture fails
here, the model is wrong, not the fixture. Negative tests assert that constraints mirrored
from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    AgentBlueprint,
    AgentRecommendation,
    GeneratedAgent,
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


def test_agent_recommendation_fixture_validates() -> None:
    AgentRecommendation.model_validate(_load("agent_recommendation.valid.json"))


def test_agent_blueprint_fixture_validates() -> None:
    AgentBlueprint.model_validate(_load("agent_blueprint.valid.json"))


def test_generated_agent_fixture_validates() -> None:
    GeneratedAgent.model_validate(_load("generated_agent.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_agent_blueprint_rejects_bad_key() -> None:
    data = _load("agent_blueprint.valid.json")
    data["key"] = "BadKey"
    with pytest.raises(ValidationError):
        AgentBlueprint.model_validate(data)


def test_agent_blueprint_rejects_empty_capabilities() -> None:
    data = _load("agent_blueprint.valid.json")
    data["capabilities"] = []
    with pytest.raises(ValidationError):
        AgentBlueprint.model_validate(data)


def test_generated_agent_rejects_empty_files() -> None:
    data = _load("generated_agent.valid.json")
    data["files"] = []
    with pytest.raises(ValidationError):
        GeneratedAgent.model_validate(data)
