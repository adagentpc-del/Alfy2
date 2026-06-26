"""Cross-runtime lockstep tests for the Execution Queue contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/execution-queue.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AddQueueItemInput, QueueItem


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


def test_queue_item_fixture_validates() -> None:
    QueueItem.model_validate(_load("queue_item.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_add_queue_item_input_constructs() -> None:
    payload = AddQueueItemInput.model_validate(
        {"bucket": "task", "category": "operations", "title": "Do the thing"}
    )
    assert payload.value_usd == 0
    assert payload.actionable is True


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_queue_item_rejects_invalid_bucket() -> None:
    payload = _load("queue_item.valid.json")
    payload["bucket"] = "someday"
    with pytest.raises(ValidationError):
        QueueItem.model_validate(payload)


def test_queue_item_rejects_invalid_category() -> None:
    payload = _load("queue_item.valid.json")
    payload["category"] = "whatever"
    with pytest.raises(ValidationError):
        QueueItem.model_validate(payload)
