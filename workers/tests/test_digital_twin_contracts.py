"""Cross-runtime lockstep tests for the Digital Twin contracts.

Mirrors `packages/shared/src/contracts/digital-twin.ts` (canonical Zod). The shared
fixture must validate against the Pydantic models; if it fails, the model is wrong, not
the fixture. Negative tests assert mirrored constraints reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import TwinSimulationInput, TwinSnapshot, TwinState


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_twin_snapshot_fixture_validates() -> None:
    TwinSnapshot.model_validate(_load("twin_snapshot.valid.json"))


def test_twin_state_constructs() -> None:
    payload = TwinState.model_validate({"businesses": 3})
    assert payload.cash_usd == 0
    assert payload.open_risks == 0


def test_rejects_invalid_scenario_kind() -> None:
    with pytest.raises(ValidationError):
        TwinSimulationInput.model_validate({"kind": "merge"})


def test_rejects_revenue_drop_fraction_out_of_range() -> None:
    with pytest.raises(ValidationError):
        TwinSimulationInput.model_validate(
            {"kind": "revenue_drop", "revenue_drop_fraction": 1.5}
        )
