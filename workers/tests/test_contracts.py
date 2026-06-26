"""Cross-runtime lockstep tests.

For each canonical fixture in `packages/shared/fixtures/`, load the JSON and construct the
matching Pydantic model. These models mirror the Zod schemas (which are canonical); if a
fixture fails here, the model is wrong, not the fixture. Negative tests assert that
constraints mirrored from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    AgentRegistration,
    ModuleManifest,
    SignalToAction,
    Task,
)


def _repo_root() -> Path:
    """Walk up from this test file until we find the repo root (has packages/shared/fixtures)."""
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_signal_to_action_fixture_validates() -> None:
    SignalToAction.model_validate(_load("signal_to_action.valid.json"))


def test_task_fixture_validates() -> None:
    Task.model_validate(_load("task.valid.json"))


def test_module_manifest_fixture_validates() -> None:
    ModuleManifest.model_validate(_load("module_manifest.valid.json"))


def test_agent_registration_fixture_validates() -> None:
    AgentRegistration.model_validate(_load("agent_registration.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_signal_to_action_rejects_confidence_above_one() -> None:
    data = _load("signal_to_action.valid.json")
    data["confidence"] = 1.5
    with pytest.raises(ValidationError):
        SignalToAction.model_validate(data)


def test_signal_to_action_rejects_empty_explanation() -> None:
    data = _load("signal_to_action.valid.json")
    data["explanation"] = ""
    with pytest.raises(ValidationError):
        SignalToAction.model_validate(data)


def test_module_manifest_rejects_bad_id() -> None:
    data = _load("module_manifest.valid.json")
    data["id"] = "Finance"
    with pytest.raises(ValidationError):
        ModuleManifest.model_validate(data)
