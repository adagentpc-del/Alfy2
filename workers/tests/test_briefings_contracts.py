"""Cross-runtime lockstep tests for the Briefing Engine contracts.

Mirrors packages/shared/src/contracts/briefings.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import Briefing, BriefingInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_briefing_fixture_validates() -> None:
    Briefing.model_validate(_load("briefing.valid.json"))


def test_briefing_input_constructs() -> None:
    payload = BriefingInput.model_validate({"kind": "morning"})
    assert payload.sections == {}
    assert payload.reflections == []


def test_briefing_rejects_invalid_kind() -> None:
    payload = _load("briefing.valid.json")
    payload["kind"] = "midnight"
    with pytest.raises(ValidationError):
        Briefing.model_validate(payload)


def test_briefing_rejects_negative_reading_minutes() -> None:
    payload = _load("briefing.valid.json")
    payload["estimated_reading_minutes"] = -1
    with pytest.raises(ValidationError):
        Briefing.model_validate(payload)
