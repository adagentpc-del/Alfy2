"""Cross-runtime lockstep tests for the Content Factory contracts.

Mirrors `packages/shared/src/contracts/content-factory.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import BuildPackageInput, ContentPackage


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_content_package_fixture_validates() -> None:
    ContentPackage.model_validate(_load("content_package.valid.json"))


def test_build_package_input_constructs() -> None:
    payload = BuildPackageInput.model_validate({"source_title": "How We 10x'd Output"})
    assert payload.brand == ""
    assert payload.business_id is None


def test_content_package_rejects_invalid_piece_kind() -> None:
    payload = _load("content_package.valid.json")
    payload["pieces"][0]["kind"] = "tweetstorm"
    with pytest.raises(ValidationError):
        ContentPackage.model_validate(payload)


def test_content_package_rejects_negative_index() -> None:
    payload = _load("content_package.valid.json")
    payload["pieces"][0]["index"] = -1
    with pytest.raises(ValidationError):
        ContentPackage.model_validate(payload)
