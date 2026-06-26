"""Cross-runtime lockstep tests for the Intelligence Lenses contracts.

Mirrors packages/shared/src/contracts/intel-lenses.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import ContrarianInput, ContrarianView, WhyThisMatters


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_why_this_matters_fixture_validates() -> None:
    WhyThisMatters.model_validate(_load("why_this_matters.valid.json"))


def test_contrarian_view_fixture_validates() -> None:
    ContrarianView.model_validate(_load("contrarian_view.valid.json"))


def test_contrarian_input_constructs() -> None:
    payload = ContrarianInput.model_validate(
        {"subject": "AI agents", "mainstream_view": "They replace everyone"}
    )
    assert payload.counter_evidence == []


def test_why_this_matters_rejects_invalid_strategy_review() -> None:
    payload = _load("why_this_matters.valid.json")
    payload["add_to_strategy_review"] = "weekly"
    with pytest.raises(ValidationError):
        WhyThisMatters.model_validate(payload)


def test_contrarian_view_rejects_empty_subject() -> None:
    payload = _load("contrarian_view.valid.json")
    payload["subject"] = ""
    with pytest.raises(ValidationError):
        ContrarianView.model_validate(payload)
