"""Cross-runtime lockstep tests for the Memory Engine contracts.

For each canonical memory fixture in `packages/shared/fixtures/`, load the JSON and
construct the matching Pydantic model. These models mirror the Zod schemas in
`packages/shared/src/contracts/memory.ts` (which are canonical); if a fixture fails here,
the model is wrong, not the fixture. Negative tests assert that constraints mirrored from
Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    CreateMemoryInput,
    MemoryLink,
    MemoryQuery,
    MemoryRecord,
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


def test_memory_record_fixture_validates() -> None:
    MemoryRecord.model_validate(_load("memory_record.valid.json"))


def test_memory_link_fixture_validates() -> None:
    MemoryLink.model_validate(_load("memory_link.valid.json"))


def test_create_memory_input_fixture_validates() -> None:
    CreateMemoryInput.model_validate(_load("create_memory_input.valid.json"))


def test_memory_query_fixture_validates() -> None:
    MemoryQuery.model_validate(_load("memory_query.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_memory_record_rejects_importance_above_one() -> None:
    data = _load("memory_record.valid.json")
    data["importance"] = 1.5
    with pytest.raises(ValidationError):
        MemoryRecord.model_validate(data)


def test_memory_record_rejects_invalid_kind() -> None:
    data = _load("memory_record.valid.json")
    data["kind"] = "spaceship"
    with pytest.raises(ValidationError):
        MemoryRecord.model_validate(data)


def test_memory_link_rejects_invalid_relation() -> None:
    data = _load("memory_link.valid.json")
    data["relation"] = "frenemy_of"
    with pytest.raises(ValidationError):
        MemoryLink.model_validate(data)
