"""Cross-runtime lockstep tests for the Personal OS contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/personal-os.ts` (which are canonical); if a fixture fails
here, the model is wrong, not the fixture. Negative tests assert that constraints
mirrored from Zod actually reject invalid payloads. A positive MemoryRecord test proves
the new `pet` memory kind works.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    InfoRequest,
    KnownEntity,
    MemoryRecord,
    PersonalEntitySpec,
    PreparePack,
    ResolveResult,
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


# --- Positive tests: shared fixtures must validate against the mirrored models ---


def test_personal_entity_spec_fixture_validates() -> None:
    PersonalEntitySpec.model_validate(_load("personal_entity_spec.valid.json"))


def test_info_request_fixture_validates() -> None:
    InfoRequest.model_validate(_load("info_request.valid.json"))


def test_known_entity_fixture_validates() -> None:
    KnownEntity.model_validate(_load("known_entity.valid.json"))


def test_prepare_pack_fixture_validates() -> None:
    PreparePack.model_validate(_load("prepare_pack.valid.json"))


def test_memory_record_accepts_pet_kind() -> None:
    """The new `pet` MemoryKind (added for Personal OS) must validate."""
    data = _load("memory_record.valid.json")
    data["kind"] = "pet"
    MemoryRecord.model_validate(data)


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_info_request_rejects_empty_missing_fields() -> None:
    data = _load("info_request.valid.json")
    data["missing_fields"] = []
    with pytest.raises(ValidationError):
        InfoRequest.model_validate(data)


def test_personal_entity_spec_rejects_invalid_module() -> None:
    data = _load("personal_entity_spec.valid.json")
    data["module"] = "spaceship"
    with pytest.raises(ValidationError):
        PersonalEntitySpec.model_validate(data)


def test_resolve_result_rejects_invalid_status() -> None:
    with pytest.raises(ValidationError):
        ResolveResult.model_validate(
            {"status": "exploded", "explanation": "bad status"}
        )
