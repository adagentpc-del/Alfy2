"""Cross-runtime lockstep tests for the GitHub Intelligence contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models. These models mirror the Zod schemas in
`packages/shared/src/contracts/github-intelligence.ts` (which is canonical); if a fixture
fails here, the model is wrong, not the fixture. Negative tests assert that constraints
mirrored from Zod actually reject invalid payloads — including the no-execution literal
`executed: false`, which is part of the contract.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    AssetLibraryEntry,
    DimensionEval,
    RepoAssessment,
    RepoScanInput,
    SecurityFinding,
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


def test_repo_scan_input_fixture_validates() -> None:
    RepoScanInput.model_validate(_load("repo_scan_input.valid.json"))


def test_repo_assessment_fixture_validates() -> None:
    RepoAssessment.model_validate(_load("repo_assessment.valid.json"))


def test_asset_library_entry_fixture_validates() -> None:
    AssetLibraryEntry.model_validate(_load("asset_library_entry.valid.json"))


# --- Negative tests: mirrored constraints must reject invalid payloads ---


def test_repo_assessment_rejects_executed_true() -> None:
    """`executed` is the literal False — the system never executes anything."""
    payload = _load("repo_assessment.valid.json")
    payload["executed"] = True
    with pytest.raises(ValidationError):
        RepoAssessment.model_validate(payload)


def test_security_finding_rejects_invalid_severity() -> None:
    with pytest.raises(ValidationError):
        SecurityFinding.model_validate(
            {
                "category": "malicious_script",
                "severity": "apocalyptic",
                "evidence": "scripts/install.sh:12 curl | sh",
                "description": "Pipes a remote script straight into a shell.",
            }
        )


def test_repo_assessment_rejects_invalid_verdict() -> None:
    payload = _load("repo_assessment.valid.json")
    payload["verdict"] = "maybe"
    with pytest.raises(ValidationError):
        RepoAssessment.model_validate(payload)


def test_dimension_eval_rejects_out_of_range_score() -> None:
    with pytest.raises(ValidationError):
        DimensionEval.model_validate(
            {"dimension": "security", "score": 1.5, "summary": "Out of range."}
        )
