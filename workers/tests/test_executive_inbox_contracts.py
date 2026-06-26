"""Cross-runtime lockstep tests for the Executive Inbox contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/executive-inbox.ts` (which are canonical); if a fixture
fails here, the model is wrong, not the fixture. Negative tests assert that constraints
mirrored from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    InboxDrop,
    ProcessedInboxItem,
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


# --- Positive tests: shared fixtures must validate against the mirrored models ---


def test_inbox_drop_fixture_validates() -> None:
    InboxDrop.model_validate(_load("inbox_drop.valid.json"))


def test_processed_inbox_item_fixture_validates() -> None:
    ProcessedInboxItem.model_validate(_load("processed_inbox_item.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_processed_inbox_item_rejects_out_of_range_confidence() -> None:
    payload = _load("processed_inbox_item.valid.json")
    payload["confidence"] = 1.5
    with pytest.raises(ValidationError):
        ProcessedInboxItem.model_validate(payload)


def test_inbox_drop_rejects_invalid_kind() -> None:
    payload = _load("inbox_drop.valid.json")
    payload["kind"] = "hologram"
    with pytest.raises(ValidationError):
        InboxDrop.model_validate(payload)


def test_processed_inbox_item_rejects_invalid_category() -> None:
    payload = _load("processed_inbox_item.valid.json")
    payload["category"] = "vibes"
    with pytest.raises(ValidationError):
        ProcessedInboxItem.model_validate(payload)
