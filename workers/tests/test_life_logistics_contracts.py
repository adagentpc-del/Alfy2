"""Cross-runtime lockstep tests for the Life Logistics Engine contracts.

Mirrors `packages/shared/src/contracts/life-logistics.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import DetectEventInput, LogisticsPlan


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_logistics_plan_fixture_validates() -> None:
    payload = _load("logistics_plan.valid.json")
    model = LogisticsPlan.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.event == payload["event"]
    assert len(model.checklists) == len(payload["checklists"])


def test_detect_event_input_constructs() -> None:
    payload = DetectEventInput.model_validate(
        {"description": "Conference", "starts_at": "2026-09-10T16:00:00.000Z"}
    )
    assert payload.overnight is False
    assert payload.has_pet is True


def test_logistics_plan_rejects_invalid_checklist_category() -> None:
    payload = _load("logistics_plan.valid.json")
    payload["checklists"][0]["category"] = "vibes"
    with pytest.raises(ValidationError):
        LogisticsPlan.model_validate(payload)
