"""Cross-runtime lockstep tests for the Board Packet Generator contracts.

Mirrors `packages/shared/src/contracts/board-packet.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import BoardPacket, GenerateBoardPacketInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_board_packet_fixture_validates() -> None:
    payload = _load("board_packet.valid.json")
    model = BoardPacket.model_validate(payload)
    assert str(model.id) == payload["id"]
    assert model.period_label == payload["period_label"]
    assert len(model.sections) == len(payload["sections"])


def test_generate_board_packet_input_constructs() -> None:
    payload = GenerateBoardPacketInput.model_validate({"period_label": "June 2026"})
    assert payload.executive_summary == ""
    assert payload.kpis == {}


def test_board_packet_rejects_empty_executive_summary() -> None:
    payload = _load("board_packet.valid.json")
    payload["executive_summary"] = ""
    with pytest.raises(ValidationError):
        BoardPacket.model_validate(payload)
