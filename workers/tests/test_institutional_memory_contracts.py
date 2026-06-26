"""Cross-runtime lockstep tests for the Institutional Memory contracts.

Mirrors `packages/shared/src/contracts/institutional-memory.ts` (canonical Zod). The
shared fixture must validate against the Pydantic models; if it fails, the model is
wrong, not the fixture. Negative tests assert mirrored constraints reject invalid
payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import CaptureRecordInput, InstitutionalRecord


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_institutional_record_fixture_validates() -> None:
    InstitutionalRecord.model_validate(_load("institutional_record.valid.json"))


def test_capture_record_input_constructs() -> None:
    payload = CaptureRecordInput.model_validate(
        {"kind": "lesson_learned", "title": "Always confirm scope"}
    )
    assert payload.detail == ""
    assert payload.alternatives_rejected == []


def test_rejects_invalid_kind() -> None:
    payload = _load("institutional_record.valid.json")
    payload["kind"] = "gossip"
    with pytest.raises(ValidationError):
        InstitutionalRecord.model_validate(payload)


def test_rejects_missing_title() -> None:
    payload = _load("institutional_record.valid.json")
    del payload["title"]
    with pytest.raises(ValidationError):
        InstitutionalRecord.model_validate(payload)
