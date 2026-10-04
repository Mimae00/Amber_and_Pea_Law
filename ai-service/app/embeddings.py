"""Embedding providers. All return one float vector per input text."""

from __future__ import annotations

from typing import Protocol

import httpx

from .config import Settings


class EmbeddingError(RuntimeError):
    pass


class Embedder(Protocol):
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...


def _with_prefix(prefix: str, text: str) -> str:
    """Adds a task prefix such as "search_query:" (used by nomic-embed-text)."""
    prefix = prefix.strip()
    return f"{prefix} {text}" if prefix else text


class _HttpEmbedder:
    """Shared logic for HTTP embedders: prefixes and batching."""

    batch_size = 32

    def __init__(self, settings: Settings) -> None:
        self._query_prefix = settings.embedding_query_prefix
        self._doc_prefix = settings.embedding_document_prefix
        self._model = settings.embedding_model
        self._timeout = settings.embedding_timeout_seconds

    def _embed(self, texts: list[str]) -> list[list[float]]:  # pragma: no cover - abstract
        raise NotImplementedError

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), self.batch_size):
            batch = [_with_prefix(self._doc_prefix, t) for t in texts[i : i + self.batch_size]]
            out.extend(self._embed(batch))
        return out

    def embed_query(self, text: str) -> list[float]:
        return self._embed([_with_prefix(self._query_prefix, text)])[0]


class OllamaEmbedder(_HttpEmbedder):
    """Local Ollama: POST /api/embed."""

    def __init__(self, settings: Settings) -> None:
        super().__init__(settings)
        self._url = settings.embedding_base_url.rstrip("/") + "/api/embed"

    def _embed(self, texts: list[str]) -> list[list[float]]:
        try:
            r = httpx.post(self._url, json={"model": self._model, "input": texts}, timeout=self._timeout)
            r.raise_for_status()
            return r.json()["embeddings"]
        except (httpx.HTTPError, KeyError, ValueError) as e:
            raise EmbeddingError(f"Ollama embedding request failed: {e}") from e


class OpenAICompatEmbedder(_HttpEmbedder):
    """Any OpenAI-compatible API: POST {base}/embeddings."""

    def __init__(self, settings: Settings) -> None:
        super().__init__(settings)
        self._url = settings.embedding_base_url.rstrip("/") + "/embeddings"
        key = settings.embedding_api_key.get_secret_value()
        self._headers = {"Authorization": f"Bearer {key}"} if key else {}

    def _embed(self, texts: list[str]) -> list[list[float]]:
        try:
            r = httpx.post(
                self._url,
                json={"model": self._model, "input": texts},
                headers=self._headers,
                timeout=self._timeout,
            )
            r.raise_for_status()
            data = sorted(r.json()["data"], key=lambda d: d["index"])
            return [d["embedding"] for d in data]
        except (httpx.HTTPError, KeyError, ValueError) as e:
            raise EmbeddingError(f"Embedding request failed: {e}") from e


class ChromaDefaultEmbedder:
    """Chroma's built-in local ONNX model (all-MiniLM-L6-v2). No external service needed."""

    def __init__(self) -> None:
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

        self._fn = DefaultEmbeddingFunction()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [list(map(float, v)) for v in self._fn(texts)]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


def create_embedder(settings: Settings) -> Embedder:
    if settings.embedding_provider == "ollama":
        return OllamaEmbedder(settings)
    if settings.embedding_provider == "openai":
        return OpenAICompatEmbedder(settings)
    return ChromaDefaultEmbedder()
