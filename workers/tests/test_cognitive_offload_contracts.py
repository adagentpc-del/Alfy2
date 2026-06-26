"""Cross-runtime lockstep tests for the Cognitive Offloading Engine contracts.

Mirrors `packages/shared/src/contracts/cognitive-offload.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import OffloadRecord, ProcessOffloadInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_offload_record_fixture_validates() -> None:
    payload = _load("offload_record.valid.json")
    model = OffloadRecord.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.kind == payload["kind"]


def test_process_offload_input_constructs() -> None:
    payload = ProcessOffloadInput.model_validate({"kind": "email", "content": "hello"})
    assert payload.business_id is None
    assert payload.businesses == []


def test_offload_record_rejects_invalid_kind() -> None:
    payload = _load("offload_record.valid.json")
    payload["kind"] = "telepathy"
    with pytest.raises(ValidationError):
        OffloadRecord.model_validate(payload)
