"""Cross-runtime lockstep tests for the Money-First Operating Mode contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/money-first.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ClassifiedItem, MoneyFirstState, WorkItem


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


def test_classified_item_fixture_validates() -> None:
    ClassifiedItem.model_validate(_load("classified_item.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_work_item_constructs() -> None:
    item = WorkItem.model_validate({"title": "Send three proposals today"})
    assert item.category == ""


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_classified_item_rejects_invalid_classification() -> None:
    payload = _load("classified_item.valid.json")
    payload["classification"] = "maybe"
    with pytest.raises(ValidationError):
        ClassifiedItem.model_validate(payload)


def test_money_first_state_rejects_missing_tenant_id() -> None:
    payload = {
        "id": "f6f6f6f6-2222-4bbb-8bbb-f6f6f6f6f6f6",
        "active": True,
        "activated_at": "2026-06-25T12:00:00.000Z",
        "updated_at": "2026-06-25T12:00:00.000Z",
    }
    with pytest.raises(ValidationError):
        MoneyFirstState.model_validate(payload)
