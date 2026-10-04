"""Streaming LLM clients: local Ollama or any OpenAI-compatible API."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Protocol

import httpx

from .config import Settings


class LLMError(RuntimeError):
    pass


Message = dict[str, str]  # {"role": "system" | "user" | "assistant", "content": str}


class LLMClient(Protocol):
    def stream(self, messages: list[Message]) -> AsyncIterator[str]: ...


class OllamaClient:
    """POST /api/chat with stream=true returns NDJSON lines."""

    def __init__(self, settings: Settings) -> None:
        self._url = settings.llm_base_url.rstrip("/") + "/api/chat"
        self._model = settings.llm_model
        self._options = {"temperature": settings.llm_temperature, "num_predict": settings.llm_max_tokens}
        self._timeout = httpx.Timeout(settings.llm_timeout_seconds, connect=5.0)

    async def stream(self, messages: list[Message]) -> AsyncIterator[str]:
        payload = {"model": self._model, "messages": messages, "stream": True, "options": self._options}
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                async with client.stream("POST", self._url, json=payload) as r:
                    if r.status_code != 200:
                        body = (await r.aread())[:300]
                        raise LLMError(f"Ollama returned {r.status_code}: {body!r}")
                    async for line in r.aiter_lines():
                        if not line.strip():
                            continue
                        data = json.loads(line)
                        if data.get("error"):
                            raise LLMError(f"Ollama error: {data['error']}")
                        token = data.get("message", {}).get("content", "")
                        if token:
                            yield token
                        if data.get("done"):
                            return
        except httpx.HTTPError as e:
            raise LLMError(f"Ollama request failed: {e}") from e


class OpenAICompatClient:
    """POST {base}/chat/completions with stream=true returns SSE `data:` lines."""

    def __init__(self, settings: Settings) -> None:
        self._url = settings.llm_base_url.rstrip("/") + "/chat/completions"
        self._model = settings.llm_model
        self._temperature = settings.llm_temperature
        self._max_tokens = settings.llm_max_tokens
        key = settings.llm_api_key.get_secret_value()
        self._headers = {"Authorization": f"Bearer {key}"} if key else {}
        self._timeout = httpx.Timeout(settings.llm_timeout_seconds, connect=5.0)

    async def stream(self, messages: list[Message]) -> AsyncIterator[str]:
        payload = {
            "model": self._model,
            "messages": messages,
            "stream": True,
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                async with client.stream("POST", self._url, json=payload, headers=self._headers) as r:
                    if r.status_code != 200:
                        body = (await r.aread())[:300]
                        raise LLMError(f"LLM API returned {r.status_code}: {body!r}")
                    async for line in r.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            return
                        chunk = json.loads(data)
                        choices = chunk.get("choices") or []
                        token = (choices[0].get("delta") or {}).get("content") if choices else None
                        if token:
                            yield token
        except httpx.HTTPError as e:
            raise LLMError(f"LLM API request failed: {e}") from e


def create_llm(settings: Settings) -> LLMClient | None:
    """Returns None for LLM_PROVIDER=none (extractive answers only)."""
    if settings.llm_provider == "ollama":
        return OllamaClient(settings)
    if settings.llm_provider == "openai":
        return OpenAICompatClient(settings)
    return None
