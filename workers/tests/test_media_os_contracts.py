"""Cross-runtime lockstep tests for the Media OS contracts.

Mirrors `packages/shared/src/contracts/media-os.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import IngestMediaInput, MediaJob


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_media_job_fixture_validates() -> None:
    MediaJob.model_validate(_load("media_job.valid.json"))


def test_ingest_media_input_constructs() -> None:
    payload = IngestMediaInput.model_validate({"kind": "podcast", "title": "Ep 1"})
    assert payload.outputs == []
    assert payload.source_ref == ""


def test_media_job_rejects_invalid_status() -> None:
    payload = _load("media_job.valid.json")
    payload["status"] = "published"
    with pytest.raises(ValidationError):
        MediaJob.model_validate(payload)


def test_media_job_rejects_invalid_kind() -> None:
    payload = _load("media_job.valid.json")
    payload["kind"] = "hologram"
    with pytest.raises(ValidationError):
        MediaJob.model_validate(payload)
