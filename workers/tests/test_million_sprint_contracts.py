"""Cross-runtime lockstep tests for the Million-Dollar Sprint Engine contracts.

Mirrors `packages/shared/src/contracts/million-sprint.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import BuildSprintInput, SprintPlan


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_sprint_plan_fixture_validates() -> None:
    payload = _load("sprint_plan.valid.json")
    model = SprintPlan.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.target_usd == payload["target_usd"]
    assert len(model.ranked_paths) == len(payload["ranked_paths"])


def test_build_sprint_input_constructs() -> None:
    payload = BuildSprintInput.model_validate({"paths": [{"label": "Big deal", "deal_size_usd": 250000}]})
    assert payload.target_usd == 1_000_000
    assert payload.paths[0].probability == 0.5


def test_build_sprint_input_rejects_empty_paths() -> None:
    with pytest.raises(ValidationError):
        BuildSprintInput.model_validate({"paths": []})
