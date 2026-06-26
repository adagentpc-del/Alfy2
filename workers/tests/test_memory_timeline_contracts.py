"""Cross-runtime lockstep tests for the Enterprise Memory Timeline contracts.

Mirrors `packages/shared/src/contracts/memory-timeline.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AddTimelineEventInput, TimelineEvent


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_timeline_event_fixture_validates() -> None:
    TimelineEvent.model_validate(_load("timeline_event.valid.json"))


def test_add_timeline_event_input_constructs() -> None:
    payload = AddTimelineEventInput.model_validate(
        {"kind": "win", "title": "Closed deal", "occurred_at": "2026-06-25T12:00:00.000Z"}
    )
    assert payload.summary == ""
    assert payload.related_assets == []


def test_timeline_event_rejects_invalid_kind() -> None:
    payload = _load("timeline_event.valid.json")
    payload["kind"] = "lunch"
    with pytest.raises(ValidationError):
        TimelineEvent.model_validate(payload)


def test_timeline_event_rejects_bad_datetime() -> None:
    payload = _load("timeline_event.valid.json")
    payload["occurred_at"] = "not-a-date"
    with pytest.raises(ValidationError):
        TimelineEvent.model_validate(payload)
