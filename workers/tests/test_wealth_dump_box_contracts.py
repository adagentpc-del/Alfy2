"""Cross-runtime lockstep tests for the Wealth Architecture Dump Box contracts.

Mirrors packages/shared/src/contracts/wealth-dump-box.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import WealthDrop, WealthItem


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_wealth_item_fixture_validates() -> None:
    WealthItem.model_validate(_load("wealth_item.valid.json"))


def test_wealth_drop_constructs() -> None:
    payload = WealthDrop.model_validate({"kind": "tax_idea", "title": "Idea"})
    assert payload.content == ""
    assert payload.business_id is None


def test_wealth_item_rejects_invalid_kind() -> None:
    payload = _load("wealth_item.valid.json")
    payload["kind"] = "lottery_idea"
    with pytest.raises(ValidationError):
        WealthItem.model_validate(payload)


def test_wealth_item_rejects_out_of_range_upside() -> None:
    payload = _load("wealth_item.valid.json")
    payload["upside"] = 1.5
    with pytest.raises(ValidationError):
        WealthItem.model_validate(payload)
