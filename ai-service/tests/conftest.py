"""Shared fixtures: settings without any .env file, plus fake embedder, collection and LLM."""

from __future__ import annotations

import math
import re
from collections.abc import AsyncIterator

import pytest

from app.config import Settings
from app.llm import LLMError, Message


def make_settings(**overrides) -> Settings:
    base = dict(
        _env_file=None,
        cors_allowed_origins="http://localhost:5173",
        llm_provider="ollama",
        embedding_provider="ollama",
        max_vector_distance=0.42,
        min_bm25_score=1.5,
        rate_limit_per_minute=1000,
    )
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


@pytest.fixture
def settings() -> Settings:
    return make_settings()


class FakeEmbedder:
    """Bag-of-words vectors over a small vocabulary, so cosine distance tracks word overlap."""

    VOCAB = ["office", "hours", "monday", "friday", "fee", "contingency", "consultation", "free",
             "custody", "child", "divorce", "address", "parking", "accident", "car"]

    def _vec(self, text: str) -> list[float]:
        words = re.findall(r"[a-z]+", text.lower())
        v = [float(sum(1 for w in words if w.startswith(t))) for t in self.VOCAB]
        if not any(v):
            v = [0.0] * len(self.VOCAB) + [1.0]  # orthogonal "unknown" direction
        else:
            v = v + [0.0]
        return v

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._vec(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._vec(text)


class FakeCollection:
    """Minimal stand-in for a Chroma collection (get + cosine query)."""

    def __init__(self, docs: dict[str, tuple[str, dict[str, str]]], embedder: FakeEmbedder) -> None:
        self.docs = docs
        self.vectors = {k: embedder.embed_query(t) for k, (t, _) in docs.items()}

    def get(self, include=None):
        ids = list(self.docs)
        return {"ids": ids, "documents": [self.docs[i][0] for i in ids], "metadatas": [self.docs[i][1] for i in ids]}

    def query(self, query_embeddings, n_results, include=None):
        q = query_embeddings[0]

        def dist(v: list[float]) -> float:
            dot = sum(a * b for a, b in zip(q, v))
            nq, nv = math.sqrt(sum(a * a for a in q)), math.sqrt(sum(b * b for b in v))
            return 1.0 - (dot / (nq * nv) if nq and nv else 0.0)

        ranked = sorted(((i, dist(v)) for i, v in self.vectors.items()), key=lambda x: x[1])[:n_results]
        return {"ids": [[i for i, _ in ranked]], "distances": [[d for _, d in ranked]]}


KB_DOCS = {
    "hours#0": (
        "Office Hours and Location - Office hours\n\nOur office is open Monday to Friday, 9:00 AM to 5:00 PM.",
        {"source": "office.md", "title": "Office Hours and Location", "section": "Office hours", "url": "/contact"},
    ),
    "hours#1": (
        "Office Hours and Location - Office address\n\nOur office address is 100 Example Avenue. Free parking is available.",
        {"source": "office.md", "title": "Office Hours and Location", "section": "Office address", "url": "/contact"},
    ),
    "fees#0": (
        "Fees and Free Consultation - Personal injury fees\n\nCar accident cases use a contingency fee. The first consultation is free.",
        {"source": "fees.md", "title": "Fees and Free Consultation", "section": "Personal injury fees", "url": "/book"},
    ),
    "family#0": (
        "Family Law - Child custody\n\nWe help parents with child custody and parenting plans after divorce.",
        {"source": "family.md", "title": "Family Law", "section": "Child custody", "url": "/practice-areas/child-custody"},
    ),
}


@pytest.fixture
def embedder() -> FakeEmbedder:
    return FakeEmbedder()


@pytest.fixture
def collection(embedder) -> FakeCollection:
    return FakeCollection(KB_DOCS, embedder)


class FakeLLM:
    def __init__(self, tokens: list[str] | None = None, fail: bool = False, fail_after: int | None = None) -> None:
        self.tokens = tokens if tokens is not None else ["Our office ", "is open ", "Monday to Friday. ", "[1]"]
        self.fail = fail
        self.fail_after = fail_after
        self.calls: list[list[Message]] = []

    async def stream(self, messages: list[Message]) -> AsyncIterator[str]:
        self.calls.append(messages)
        if self.fail:
            raise LLMError("connection refused")
        for i, t in enumerate(self.tokens):
            if self.fail_after is not None and i == self.fail_after:
                raise LLMError("stream broke")
            yield t
