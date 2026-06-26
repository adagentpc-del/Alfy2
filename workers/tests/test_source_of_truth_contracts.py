"""Cross-runtime lockstep tests for the Source-of-Truth Management contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/source-of-truth.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import RecordTruthInput, SourceRecord


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


def test_source_record_fixture_validates() -> None:
    SourceRecord.model_validate(_load("source_record.valid.json"))


# --- Positive: inline-constructed input must validate ---


def test_record_truth_input_constructs() -> None:
    record = RecordTruthInput.model_validate(
        {
            "kind": "verified_fact",
            "statement": "ARR crossed $1M in Q2.",
            "source": "Stripe dashboard",
            "owner": "founder",
        }
    )
    assert record.confidence == 0.5
    assert record.update_trigger == ""
    assert record.tags == []


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_source_record_rejects_invalid_kind() -> None:
    payload = _load("source_record.valid.json")
    payload["kind"] = "rumor"
    with pytest.raises(ValidationError):
        SourceRecord.model_validate(payload)


def test_source_record_rejects_invalid_freshness() -> None:
    payload = _load("source_record.valid.json")
    payload["freshness"] = "ancient"
    with pytest.raises(ValidationError):
        SourceRecord.model_validate(payload)


def test_source_record_rejects_confidence_over_one() -> None:
    payload = _load("source_record.valid.json")
    payload["confidence"] = 1.5
    with pytest.raises(ValidationError):
        SourceRecord.model_validate(payload)
