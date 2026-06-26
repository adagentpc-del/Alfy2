"""Cross-runtime lockstep tests for the Podcast Studio OS contracts.

Mirrors packages/shared/src/contracts/podcast-studio.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import EpisodeIdeaInput, EpisodePlan


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_episode_plan_fixture_validates() -> None:
    EpisodePlan.model_validate(_load("episode_plan.valid.json"))


def test_episode_idea_input_constructs() -> None:
    payload = EpisodeIdeaInput.model_validate({"topic": "AI agents"})
    assert payload.source == ""
    assert payload.related_businesses == []


def test_episode_plan_rejects_invalid_stage() -> None:
    payload = _load("episode_plan.valid.json")
    payload["stage"] = "cancelled"
    with pytest.raises(ValidationError):
        EpisodePlan.model_validate(payload)


def test_episode_plan_rejects_empty_title() -> None:
    payload = _load("episode_plan.valid.json")
    payload["title"] = ""
    with pytest.raises(ValidationError):
        EpisodePlan.model_validate(payload)
