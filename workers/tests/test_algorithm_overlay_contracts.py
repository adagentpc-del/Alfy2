"""Cross-runtime lockstep tests for the Algorithm Overlay System contracts.

Mirrors packages/shared/src/contracts/algorithm-overlay.ts (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import AlgorithmScore, ScoreRequest


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_algorithm_score_fixture_validates() -> None:
    AlgorithmScore.model_validate(_load("algorithm_score.valid.json"))


def test_score_request_constructs() -> None:
    payload = ScoreRequest.model_validate({"algorithm": "roi", "subject": "Ship it"})
    assert payload.signals == {}
    assert payload.override is None


def test_algorithm_score_rejects_invalid_algorithm() -> None:
    payload = _load("algorithm_score.valid.json")
    payload["algorithm"] = "vibes"
    with pytest.raises(ValidationError):
        AlgorithmScore.model_validate(payload)


def test_algorithm_score_rejects_out_of_range_score() -> None:
    payload = _load("algorithm_score.valid.json")
    payload["score"] = 2
    with pytest.raises(ValidationError):
        AlgorithmScore.model_validate(payload)
