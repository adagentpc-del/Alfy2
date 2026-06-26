"""Cross-runtime lockstep tests for the Story Mining contracts.

Mirrors `packages/shared/src/contracts/story-mining.ts` (canonical). If a fixture fails
here, the Pydantic model is wrong, not the fixture.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import MineStoryInput, Story


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_story_fixture_validates() -> None:
    Story.model_validate(_load("story.valid.json"))


def test_mine_story_input_constructs() -> None:
    payload = MineStoryInput.model_validate({"source": "win", "raw": "We shipped."})
    assert payload.business_id is None
    assert payload.businesses == []


def test_story_rejects_invalid_source() -> None:
    payload = _load("story.valid.json")
    payload["source"] = "not_a_source"
    with pytest.raises(ValidationError):
        Story.model_validate(payload)


def test_story_rejects_invalid_urgency() -> None:
    payload = _load("story.valid.json")
    payload["urgency"] = "yesterday"
    with pytest.raises(ValidationError):
        Story.model_validate(payload)
