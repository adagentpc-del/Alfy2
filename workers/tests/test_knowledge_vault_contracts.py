"""Cross-runtime lockstep tests for the Knowledge Vault contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/knowledge-vault.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import VaultDrop, VaultEntry


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- Positive: shared fixture must validate ---


def test_vault_entry_fixture_validates() -> None:
    VaultEntry.model_validate(_load("vault_entry.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_vault_drop_constructs() -> None:
    drop = VaultDrop.model_validate({"kind": "book", "title": "Influence"})
    assert drop.content == ""
    assert drop.business_ids == []
    assert drop.businesses == []


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_vault_entry_rejects_invalid_kind() -> None:
    payload = _load("vault_entry.valid.json")
    payload["kind"] = "tweet"
    with pytest.raises(ValidationError):
        VaultEntry.model_validate(payload)


def test_vault_entry_rejects_negative_converted_to_actions() -> None:
    payload = _load("vault_entry.valid.json")
    payload["converted_to_actions"] = -1
    with pytest.raises(ValidationError):
        VaultEntry.model_validate(payload)
