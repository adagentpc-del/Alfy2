"""Cross-runtime lockstep tests for the Hierarchy contracts.

Mirrors `packages/shared/src/contracts/hierarchy.ts` (canonical Zod). The shared fixture
must validate against the Pydantic models; if it fails, the model is wrong, not the
fixture. Negative tests assert mirrored constraints reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import CreateHierarchyNodeInput, HierarchyNode


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_hierarchy_node_fixture_validates() -> None:
    HierarchyNode.model_validate(_load("hierarchy_node.valid.json"))


def test_create_hierarchy_node_input_constructs() -> None:
    payload = CreateHierarchyNodeInput.model_validate(
        {"level": "company", "name": "Acme Co"}
    )
    assert payload.parent_id is None
    assert payload.own.policies == []


def test_rejects_invalid_level() -> None:
    payload = _load("hierarchy_node.valid.json")
    payload["level"] = "galaxy"
    with pytest.raises(ValidationError):
        HierarchyNode.model_validate(payload)


def test_rejects_missing_name() -> None:
    payload = _load("hierarchy_node.valid.json")
    del payload["name"]
    with pytest.raises(ValidationError):
        HierarchyNode.model_validate(payload)
