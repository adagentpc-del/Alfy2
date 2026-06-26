"""Cross-runtime lockstep tests for the Business Template contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/business.ts` (which are canonical); if a fixture fails
here, the model is wrong, not the fixture. Negative tests assert that constraints
mirrored from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    Business,
    CreateBusinessInput,
    DepartmentSpec,
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


def test_department_spec_fixture_validates() -> None:
    DepartmentSpec.model_validate(_load("department_spec.valid.json"))


def test_create_business_input_fixture_validates() -> None:
    CreateBusinessInput.model_validate(_load("create_business_input.valid.json"))


def test_business_fixture_validates() -> None:
    Business.model_validate(_load("business.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_business_rejects_bad_slug() -> None:
    data = _load("business.valid.json")
    data["slug"] = "Move Mi"
    with pytest.raises(ValidationError):
        Business.model_validate(data)


def test_department_spec_rejects_bad_kind() -> None:
    data = _load("department_spec.valid.json")
    data["kind"] = "janitor"
    with pytest.raises(ValidationError):
        DepartmentSpec.model_validate(data)


def test_department_spec_rejects_empty_capabilities() -> None:
    data = _load("department_spec.valid.json")
    data["capabilities"] = []
    with pytest.raises(ValidationError):
        DepartmentSpec.model_validate(data)
