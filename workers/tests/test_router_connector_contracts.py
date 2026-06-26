"""Cross-runtime lockstep tests for the Model Router and Connector Registry contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/model-router.ts` and `connector-registry.ts` (which are
canonical); if a fixture fails here, the model is wrong, not the fixture. Negative tests
assert that constraints mirrored from Zod actually reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    ConnectorDescriptor,
    ModelDescriptor,
    ModelScore,
    RoutingDecision,
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


def test_model_descriptor_fixture_validates() -> None:
    ModelDescriptor.model_validate(_load("model_descriptor.valid.json"))


def test_routing_decision_fixture_validates() -> None:
    RoutingDecision.model_validate(_load("routing_decision.valid.json"))


def test_connector_descriptor_fixture_validates() -> None:
    ConnectorDescriptor.model_validate(_load("connector_descriptor.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_model_score_rejects_out_of_range_score() -> None:
    with pytest.raises(ValidationError):
        ModelScore.model_validate({"model_id": "gpt-codex", "score": 1.5})


def test_routing_decision_rejects_empty_ranked() -> None:
    payload = _load("routing_decision.valid.json")
    payload["ranked"] = []
    with pytest.raises(ValidationError):
        RoutingDecision.model_validate(payload)


def test_connector_descriptor_rejects_invalid_authentication() -> None:
    payload = _load("connector_descriptor.valid.json")
    payload["authentication"] = "telepathy"
    with pytest.raises(ValidationError):
        ConnectorDescriptor.model_validate(payload)
