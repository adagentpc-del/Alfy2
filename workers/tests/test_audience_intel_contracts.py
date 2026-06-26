"""Cross-runtime lockstep tests for the Audience Intelligence contracts.

Mirrors `packages/shared/src/contracts/audience-intel.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AnalyzeAudienceInput, AudienceProfile


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_audience_profile_fixture_validates() -> None:
    AudienceProfile.model_validate(_load("audience_profile.valid.json"))


def test_analyze_audience_input_constructs() -> None:
    payload = AnalyzeAudienceInput.model_validate(
        {"audience_name": "Solo founders", "signals": [{"kind": "dm", "text": "hi"}]}
    )
    assert payload.business_id is None
    assert payload.signals[0].kind == "dm"


def test_audience_profile_rejects_invalid_signal_kind() -> None:
    payload = _load("audience_profile.valid.json")
    with pytest.raises(ValidationError):
        AnalyzeAudienceInput.model_validate(
            {"audience_name": "X", "signals": [{"kind": "telepathy", "text": "hi"}]}
        )
    _ = payload


def test_audience_profile_rejects_negative_signal_count() -> None:
    payload = _load("audience_profile.valid.json")
    payload["signal_count"] = -1
    with pytest.raises(ValidationError):
        AudienceProfile.model_validate(payload)
