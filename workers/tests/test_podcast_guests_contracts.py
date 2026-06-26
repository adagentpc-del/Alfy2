"""Cross-runtime lockstep tests for the Podcast Guest Booking contracts.

Mirrors packages/shared/src/contracts/podcast-guests.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import GuestCandidateInput, GuestRecord


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_guest_record_fixture_validates() -> None:
    GuestRecord.model_validate(_load("guest_record.valid.json"))


def test_guest_candidate_input_constructs() -> None:
    payload = GuestCandidateInput.model_validate({"name": "Maya Chen"})
    assert payload.direction == "inbound_guest"
    assert payload.relevance == 0.5


def test_guest_record_rejects_invalid_status() -> None:
    payload = _load("guest_record.valid.json")
    payload["status"] = "ghosted"
    with pytest.raises(ValidationError):
        GuestRecord.model_validate(payload)


def test_guest_record_rejects_out_of_range_rank_score() -> None:
    payload = _load("guest_record.valid.json")
    payload["rank_score"] = 1.5
    with pytest.raises(ValidationError):
        GuestRecord.model_validate(payload)
