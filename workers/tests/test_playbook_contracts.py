"""Cross-runtime lockstep tests for the Enterprise Playbook Generator contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/playbook.ts` (canonical). If a fixture fails here, the
model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import Playbook, PlaybookArtifact


def _repo_root() -> Path:
    """Walk up from this test file until we find the repo root (has packages/shared/fixtures)."""
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- Positive: shared fixture must validate ---


def test_playbook_fixture_validates() -> None:
    Playbook.model_validate(_load("playbook.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_playbook_artifact_constructs() -> None:
    artifact = PlaybookArtifact.model_validate(
        {"kind": "workflow", "title": "Onboard a new client"}
    )
    assert artifact.body == ""
    assert artifact.tags == []


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_playbook_artifact_rejects_invalid_kind() -> None:
    with pytest.raises(ValidationError):
        PlaybookArtifact.model_validate({"kind": "meme", "title": "Bad kind"})


def test_playbook_rejects_invalid_domain() -> None:
    payload = _load("playbook.valid.json")
    payload["domain"] = "engineering"
    with pytest.raises(ValidationError):
        Playbook.model_validate(payload)


def test_playbook_artifact_rejects_missing_title() -> None:
    with pytest.raises(ValidationError):
        PlaybookArtifact.model_validate({"kind": "sop"})
