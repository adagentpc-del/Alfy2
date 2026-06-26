"""Cross-runtime lockstep tests for the Legacy Engine contracts.

Mirrors `packages/shared/src/contracts/legacy.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import CaptureLegacyInput, LegacyItem


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_legacy_item_fixture_validates() -> None:
    LegacyItem.model_validate(_load("legacy_item.valid.json"))


def test_capture_legacy_input_constructs() -> None:
    payload = CaptureLegacyInput.model_validate({"kind": "framework", "title": "A Framework"})
    assert payload.repeatability == 0.5
    assert payload.strategic_value == 0.5


def test_legacy_item_rejects_invalid_kind() -> None:
    payload = _load("legacy_item.valid.json")
    payload["kind"] = "tweet"
    with pytest.raises(ValidationError):
        LegacyItem.model_validate(payload)


def test_legacy_item_rejects_out_of_range_score() -> None:
    payload = _load("legacy_item.valid.json")
    payload["legacy_score"] = 1.1
    with pytest.raises(ValidationError):
        LegacyItem.model_validate(payload)
