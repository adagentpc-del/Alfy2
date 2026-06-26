"""Cross-runtime lockstep tests for the Knowledge Graph contracts.

Mirrors `packages/shared/src/contracts/knowledge-graph.ts` (canonical Zod). The shared
fixture must validate against the Pydantic models; if it fails, the model is wrong, not
the fixture. Negative tests assert mirrored constraints reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import GraphEdge, GraphNode, GraphQuery


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_graph_node_fixture_validates() -> None:
    GraphNode.model_validate(_load("graph_node.valid.json"))


def test_graph_query_constructs() -> None:
    payload = GraphQuery.model_validate({"kinds": ["person", "vendor"]})
    assert payload.terms == []


def test_rejects_invalid_kind() -> None:
    payload = _load("graph_node.valid.json")
    payload["kind"] = "alien"
    with pytest.raises(ValidationError):
        GraphNode.model_validate(payload)


def test_rejects_edge_weight_out_of_range() -> None:
    with pytest.raises(ValidationError):
        GraphEdge.model_validate(
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "tenant_id": "22222222-2222-2222-2222-222222222222",
                "from_id": "33333333-3333-3333-3333-333333333333",
                "to_id": "44444444-4444-4444-4444-444444444444",
                "relationship": "works_on",
                "weight": 1.5,
                "created_at": "2026-01-01T00:00:00Z",
            }
        )
