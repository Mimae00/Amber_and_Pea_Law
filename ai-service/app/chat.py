"""Chat orchestration: guardrails -> hybrid retrieval -> relevance gate -> streamed answer."""

from __future__ import annotations

import logging
import re
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from starlette.concurrency import run_in_threadpool

from . import guardrails
from .config import Settings
from .guardrails import Intent
from .llm import LLMClient, LLMError, Message
from .prompts import build_messages
from .retrieval import Hit, HybridRetriever

log = logging.getLogger(__name__)

_LEADING_CITATION = re.compile(r"^\s*(\[\d+\]\s*)+")


@dataclass(frozen=True)
class Event:
    name: str  # meta | token | done | error
    data: dict[str, Any]


def citations_for(hits: list[Hit]) -> list[dict[str, Any]]:
    """Numbered like the [n] markers in the prompt context."""
    return [
        {
            "n": n,
            "title": h.metadata.get("title", ""),
            "section": h.metadata.get("section", ""),
            "url": h.metadata.get("url", ""),
            "source": h.metadata.get("source", ""),
        }
        for n, h in enumerate(hits, start=1)
    ]


def _strip_header(text: str) -> str:
    # Chunks start with "Title - Section" followed by a blank line.
    parts = text.split("\n\n", 1)
    return parts[1] if len(parts) == 2 else text


def extractive_answer(hits: list[Hit], max_chars: int = 420, lead: str = "Here's what our site says: ") -> str:
    """Answer without an LLM: the most relevant passage, trimmed to whole sentences."""
    top = hits[0]
    body = _strip_header(top.text)
    body = re.sub(r"^\s*[-*]\s+", "", body, flags=re.MULTILINE)  # flatten bullets
    body = re.sub(r"\*\*|__|`", "", body)
    body = re.sub(r"\s+", " ", body).strip()
    sentences = re.split(r"(?<=[.!?])\s+", body)
    out = ""
    for s in sentences:
        if out and len(out) + len(s) + 1 > max_chars:
            break
        out = f"{out} {s}".strip()
    if len(out) > max_chars:
        out = out[: max_chars - 1].rsplit(" ", 1)[0] + "…"
    return f"{lead}{out} [1]"


class ChatService:
    def __init__(self, retriever: HybridRetriever, llm: LLMClient | None, settings: Settings) -> None:
        self._retriever = retriever
        self._llm = llm
        self._s = settings

    async def answer(self, question: str, history: list[Message]) -> AsyncIterator[Event]:
        s = self._s
        assessment = guardrails.assess(question)
        meta_base = {"suggest_booking": assessment.suggest_booking, "suggest_contact": assessment.suggest_contact}

        # Fixed replies that never go to the LLM.
        canned = {
            Intent.EMERGENCY: lambda: guardrails.emergency_reply(s.firm_phone),
            Intent.OUTCOME: lambda: guardrails.outcome_reply(s.firm_name),
            Intent.GREETING: lambda: guardrails.greeting_reply(s.firm_name),
        }.get(assessment.intent)
        if canned:
            yield Event("meta", {**meta_base, "citations": [], "intent": assessment.intent.value})
            yield Event("token", {"text": canned()})
            yield Event("done", {"mode": "canned"})
            return

        hits = await run_in_threadpool(self._retriever.search, question)
        if not hits or not self._retriever.is_relevant(hits):
            yield Event(
                "meta",
                {"suggest_booking": True, "suggest_contact": True, "citations": [], "intent": "not_found"},
            )
            yield Event("token", {"text": guardrails.not_found_reply(s.firm_phone)})
            yield Event("done", {"mode": "canned"})
            return

        advice = assessment.intent == Intent.ADVICE
        if self._llm is None:
            used = hits[:1]
            yield Event("meta", {**meta_base, "citations": citations_for(used), "intent": assessment.intent.value})
            if advice:
                yield Event("token", {"text": guardrails.ADVICE_PREFIX})
            yield Event("token", {"text": extractive_answer(used, lead="" if advice else "Here's what our site says: ")})
            yield Event("done", {"mode": "extractive"})
            return

        yield Event("meta", {**meta_base, "citations": citations_for(hits), "intent": assessment.intent.value})
        if advice:
            yield Event("token", {"text": guardrails.ADVICE_PREFIX})

        messages = build_messages(s.firm_name, s.firm_phone, hits, history, question, advice)
        sent_any = False
        head = ""  # small models sometimes open with a bare "[1]"; hold the first few chars to strip it
        try:
            async for token in self._llm.stream(messages):
                sent_any = True
                if head is not None:
                    head += token
                    if len(head) < 12:
                        continue
                    token, head = _LEADING_CITATION.sub("", head, count=1), None
                    if not token:
                        continue
                yield Event("token", {"text": token})
            if head:
                yield Event("token", {"text": _LEADING_CITATION.sub("", head, count=1)})
        except LLMError as e:
            log.warning("LLM unavailable: %s", e)
            if sent_any:
                yield Event("error", {"message": "The answer was interrupted. Please try again."})
                return
            # Nothing streamed yet: fall back to the best passage so the visitor still gets an answer.
            yield Event("token", {"text": extractive_answer(hits, lead="" if advice else "Here's what our site says: ")})
            yield Event("done", {"mode": "extractive_fallback"})
            return
        yield Event("done", {"mode": "llm"})
