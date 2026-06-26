"""Cross-runtime lockstep tests for the Operating Manual contracts.

Mirrors `packages/shared/src/contracts/operating-manual.ts` (canonical Zod). The shared
fixture must validate against the Pydantic models; if it fails, the model is wrong, not
the fixture. Negative tests assert mirrored constraints reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import GenerateManualInput, OperatingManual


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_operating_manual_fixture_validates() -> None:
    OperatingManual.model_validate(_load("operating_manual.valid.json"))


def test_generate_manual_input_constructs() -> None:
    payload = GenerateManualInput.model_validate({"workflow_name": "Onboarding"})
    assert payload.is_stable is True
    assert payload.business_id is None


def test_rejects_invalid_artifact_kind() -> None:
    payload = _load("operating_manual.valid.json")
    payload["artifacts"][0]["kind"] = "memo"
    with pytest.raises(ValidationError):
        OperatingManual.model_validate(payload)


def test_rejects_missing_workflow_name() -> None:
    payload = _load("operating_manual.valid.json")
    del payload["workflow_name"]
    with pytest.raises(ValidationError):
        OperatingManual.model_validate(payload)
