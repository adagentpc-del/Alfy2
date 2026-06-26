"""Cross-runtime lockstep tests for the Tenancy / Founder Intelligence System contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/tenancy.ts` (which are canonical); if a fixture fails
here, the model is wrong, not the fixture. Negative tests assert that constraints mirrored
from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    BillingAccount,
    FounderTenant,
    Grant,
    KnowledgeDoc,
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


def test_founder_tenant_fixture_validates() -> None:
    FounderTenant.model_validate(_load("founder_tenant.valid.json"))


def test_billing_account_fixture_validates() -> None:
    BillingAccount.model_validate(_load("billing_account.valid.json"))


def test_grant_fixture_validates() -> None:
    Grant.model_validate(_load("grant.valid.json"))


def test_knowledge_doc_fixture_validates() -> None:
    KnowledgeDoc.model_validate(_load("knowledge_doc.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_founder_tenant_rejects_bad_slug() -> None:
    with pytest.raises(ValidationError):
        FounderTenant.model_validate(
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "name": "Bad Slug Co",
                "slug": "Bad Slug",
                "created_at": "2026-06-24T12:00:00.000Z",
            }
        )


def test_grant_rejects_invalid_role() -> None:
    with pytest.raises(ValidationError):
        Grant.model_validate(
            {
                "id": "0c222222-2222-4ccc-8ccc-0c2222222222",
                "tenant_id": "00000000-0000-0000-0000-000000000001",
                "principal": "adagentpc@gmail.com",
                "role": "superuser",
                "created_at": "2026-06-24T12:00:00.000Z",
            }
        )


def test_billing_account_rejects_zero_seats() -> None:
    with pytest.raises(ValidationError):
        BillingAccount.model_validate(
            {
                "id": "0b111111-1111-4bbb-8bbb-0b1111111111",
                "tenant_id": "00000000-0000-0000-0000-000000000001",
                "plan": "scale",
                "seats": 0,
                "created_at": "2026-06-24T12:00:00.000Z",
            }
        )
