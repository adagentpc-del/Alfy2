"""Cross-runtime lockstep tests for the Knowledge Ingestion Engine contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/knowledge-ingestion.ts` (canonical). If a fixture fails
here, the model is wrong, not the fixture. Negative tests assert mirrored constraints
reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import IngestedItem, IngestInput


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


def test_ingested_item_fixture_validates() -> None:
    IngestedItem.model_validate(_load("ingested_item.valid.json"))


# --- Positive: inline-constructed model must validate (defaults) ---


def test_ingest_input_constructs_with_defaults() -> None:
    payload = IngestInput.model_validate({"source_type": "note", "title": "A quick note"})
    assert payload.content == ""
    assert payload.location == ""
    assert payload.businesses == []
    assert payload.goals == []
    assert payload.campaigns == []


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_ingested_item_rejects_invalid_source_type() -> None:
    payload = _load("ingested_item.valid.json")
    payload["source_type"] = "tweet"
    with pytest.raises(ValidationError):
        IngestedItem.model_validate(payload)


def test_ingest_input_rejects_missing_title() -> None:
    with pytest.raises(ValidationError):
        IngestInput.model_validate({"source_type": "book"})
