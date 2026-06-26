"""Cross-runtime lockstep tests for the Alfy² identity/voice contracts.

Mirrors the canonical Zod contracts:
`packages/shared/src/contracts/{identity-os,philosophy-library,conversation,
vision-builder,voice-interface}.ts`.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    ConversationExtraction,
    IdentityAlignmentVerdict,
    Philosophy,
    VisionSession,
    VoiceCommand,
)


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_identity_alignment_verdict_fixture_validates() -> None:
    payload = _load("identity_alignment_verdict.valid.json")
    model = IdentityAlignmentVerdict.model_validate(payload)
    assert model.recommendation == payload["recommendation"]
    assert model.aligns == payload["aligns"]
    assert model.should_say_no == payload["should_say_no"]
    assert model.identity_overrode_optimization == payload["identity_overrode_optimization"]


def test_philosophy_fixture_validates() -> None:
    payload = _load("philosophy.valid.json")
    model = Philosophy.model_validate(payload)
    assert model.name == payload["name"]
    assert model.core == payload["core"]
    assert model.revision == payload["revision"]


def test_conversation_extraction_fixture_validates() -> None:
    payload = _load("conversation_extraction.valid.json")
    model = ConversationExtraction.model_validate(payload)
    assert model.utterance == payload["utterance"]
    assert len(model.outputs) == len(payload["outputs"])
    if payload["outputs"]:
        assert model.outputs[0].kind == payload["outputs"][0]["kind"]


def test_vision_session_fixture_validates() -> None:
    payload = _load("vision_session.valid.json")
    model = VisionSession.model_validate(payload)
    assert model.idea == payload["idea"]
    assert model.awaiting_approval is True
    assert len(model.artifacts) == len(payload["artifacts"])


def test_vision_session_rejects_non_true_awaiting_approval() -> None:
    payload = _load("vision_session.valid.json")
    payload["awaiting_approval"] = False
    with pytest.raises(ValidationError):
        VisionSession.model_validate(payload)


def test_voice_command_fixture_validates() -> None:
    payload = _load("voice_command.valid.json")
    model = VoiceCommand.model_validate(payload)
    assert model.utterance == payload["utterance"]
    assert model.intent == payload["intent"]
    assert model.category == payload["category"]
    assert model.target == payload["target"]
    assert model.requires_confirmation == payload["requires_confirmation"]


def test_voice_command_target_defaults_to_none() -> None:
    model = VoiceCommand.model_validate(
        {
            "utterance": "Read my morning briefing",
            "intent": "read_briefing",
            "category": "query",
            "requires_confirmation": False,
            "spoken_response": "Here is your morning briefing.",
        }
    )
    assert model.target is None


def test_voice_command_rejects_invalid_intent() -> None:
    payload = _load("voice_command.valid.json")
    payload["intent"] = "teleport"
    with pytest.raises(ValidationError):
        VoiceCommand.model_validate(payload)
