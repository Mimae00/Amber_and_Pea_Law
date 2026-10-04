"""FastAPI app: streaming chat endpoint plus liveness/readiness probes."""

from __future__ import annotations

import json
import logging
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from .chat import ChatService, Event
from .config import Settings, get_settings
from .embeddings import create_embedder
from .llm import create_llm
from .rate_limit import SlidingWindowLimiter
from .retrieval import HybridRetriever
from .vector_store import create_client, get_collection

log = logging.getLogger("ai_service")


def configure_logging(level: str) -> None:
    logging.basicConfig(
        stream=sys.stdout,
        level=level.upper(),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        force=True,
    )
    for noisy in ("httpx", "chromadb"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=20)

    @field_validator("message")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message must not be blank")
        return v


def sse(event: Event) -> str:
    return f"event: {event.name}\ndata: {json.dumps(event.data, ensure_ascii=False)}\n\n"


def create_app(settings: Settings | None = None, chat_service: ChatService | None = None) -> FastAPI:
    """App factory. Tests can inject a ChatService with fake retriever/LLM."""
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if chat_service is not None:
            app.state.chat = chat_service
            app.state.retriever = None
        else:
            client = create_client(settings)
            collection = get_collection(client, settings)
            retriever = HybridRetriever(collection, create_embedder(settings), settings)
            try:
                count = await run_in_threadpool(retriever.load)
            except Exception:  # noqa: BLE001 - stay up and report not-ready instead of crashing
                log.exception("Could not load the knowledge base index")
                count = 0
            if count == 0:
                log.warning("Knowledge base is empty. Run the ingest script: knowledge-base/ingest.py")
            app.state.retriever = retriever
            app.state.chat = ChatService(retriever, create_llm(settings), settings)
        log.info(
            "AI service ready (llm=%s model=%s, embeddings=%s, chroma=%s)",
            settings.llm_provider,
            settings.llm_model if settings.llm_provider != "none" else "-",
            settings.embedding_provider,
            settings.chroma_mode,
        )
        yield

    app = FastAPI(
        title="Amber & Pea Law AI service",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url=None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
        allow_credentials=False,
        max_age=3600,
    )
    limiter = SlidingWindowLimiter(settings.rate_limit_per_minute)

    def client_ip(request: Request) -> str:
        if settings.rate_limit_trust_forwarded:
            xff = request.headers.get("x-forwarded-for")
            if xff:
                return xff.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    @app.get("/health/live")
    async def live() -> dict[str, str]:
        return {"status": "UP"}

    @app.get("/health/ready")
    async def ready(request: Request) -> JSONResponse:
        retriever: HybridRetriever | None = request.app.state.retriever
        if retriever is None:  # injected service (tests)
            return JSONResponse({"status": "UP"})
        try:
            loaded = await run_in_threadpool(retriever.ensure_loaded)
        except Exception:  # noqa: BLE001
            log.exception("Readiness check failed")
            loaded = False
        if not loaded:
            return JSONResponse({"status": "DOWN", "reason": "knowledge base not loaded"}, status_code=503)
        return JSONResponse({"status": "UP", "chunks": retriever.size})

    @app.post("/chat/stream")
    async def chat_stream(body: ChatRequest, request: Request):
        allowed, retry_after = limiter.check(client_ip(request))
        if not allowed:
            return JSONResponse(
                {"detail": "Too many messages. Please wait a minute and try again."},
                status_code=429,
                headers={"Retry-After": str(retry_after)},
            )
        service: ChatService = request.app.state.chat
        history = [m.model_dump() for m in body.history]

        async def events() -> AsyncIterator[str]:
            try:
                async for event in service.answer(body.message, history):
                    yield sse(event)
            except Exception:  # noqa: BLE001 - never leak internals to the browser
                log.exception("Chat request failed")
                yield sse(Event("error", {"message": "The assistant is unavailable right now."}))

        return StreamingResponse(
            events(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return app


def run() -> None:
    import uvicorn

    s = get_settings()
    uvicorn.run("app.main:create_app", factory=True, host=s.host, port=s.port, log_level=s.log_level.lower())


if __name__ == "__main__":
    run()
