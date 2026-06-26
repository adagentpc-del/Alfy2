"""Cross-runtime lockstep tests for the Founder Nervous System Protection contracts.

Mirrors `packages/shared/src/contracts/nervous-system.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import NervousSystemInput, NervousSystemReport


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_nervous_system_report_fixture_validates() -> None:
    payload = _load("nervous_system_report.valid.json")
    model = NervousSystemReport.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.status == payload["status"]


def test_nervous_system_input_constructs() -> None:
    payload = NervousSystemInput.model_validate({})
    assert payload.sleep_energy == 0.6
    assert payload.unresolved_stress_loops == 0


def test_nervous_system_report_rejects_invalid_status() -> None:
    payload = _load("nervous_system_report.valid.json")
    payload["status"] = "meltdown"
    with pytest.raises(ValidationError):
        NervousSystemReport.model_validate(payload)
