"""Cross-runtime lockstep tests for the Knowledge-to-Action Converter contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/knowledge-to-action.ts` (canonical). If a fixture fails
here, the model is wrong, not the fixture. Negative tests assert mirrored constraints
reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ConvertIdeaInput, KnowledgeAction


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


def test_knowledge_action_fixture_validates() -> None:
    KnowledgeAction.model_validate(_load("knowledge_action.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_convert_idea_input_constructs() -> None:
    payload = ConvertIdeaInput.model_validate({"idea": "Run a Mom-Test discovery script."})
    assert payload.owner == "owner"
    assert payload.business is None
    assert payload.value_signal == 0.5
    assert payload.is_campaign_shaped is False
    assert payload.deadline is None


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_knowledge_action_rejects_invalid_disposition() -> None:
    payload = _load("knowledge_action.valid.json")
    payload["disposition"] = "maybe"
    with pytest.raises(ValidationError):
        KnowledgeAction.model_validate(payload)


def test_convert_idea_input_rejects_out_of_bounds_value_signal() -> None:
    with pytest.raises(ValidationError):
        ConvertIdeaInput.model_validate({"idea": "An idea.", "value_signal": 1.5})
