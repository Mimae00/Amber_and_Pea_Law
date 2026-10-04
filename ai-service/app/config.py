"""Configuration from environment variables (and ai-service/.env for local runs)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVICE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server
    host: str = "127.0.0.1"
    port: int = 8000
    log_level: str = "INFO"
    cors_allowed_origins: str = Field(..., description="Comma-separated list, no wildcards")

    # Rate limiting (per client IP)
    rate_limit_per_minute: int = 20
    rate_limit_trust_forwarded: bool = False

    # LLM: "ollama", "openai" (any OpenAI-compatible API) or "none" (extractive answers only)
    llm_provider: Literal["ollama", "openai", "none"] = "ollama"
    llm_base_url: str = "http://localhost:11434"
    llm_model: str = "llama3.2:1b"
    llm_api_key: SecretStr = SecretStr("")
    llm_temperature: float = 0.1
    llm_max_tokens: int = 350
    llm_timeout_seconds: float = 60.0

    # Embeddings: "ollama", "openai" (compatible) or "default" (Chroma's built-in local ONNX model)
    embedding_provider: Literal["ollama", "openai", "default"] = "ollama"
    embedding_base_url: str = "http://localhost:11434"
    embedding_model: str = "nomic-embed-text"
    embedding_api_key: SecretStr = SecretStr("")
    embedding_query_prefix: str = ""
    embedding_document_prefix: str = ""
    embedding_timeout_seconds: float = 30.0

    # Vector store: "persistent" (embedded, local folder) or "http" (Chroma server)
    chroma_mode: Literal["persistent", "http"] = "persistent"
    chroma_path: str = "./data/chroma"
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_ssl: bool = False
    chroma_collection: str = "amber_pea_kb"

    # Knowledge base and retrieval
    knowledge_base_dir: str = "../knowledge-base"
    retrieval_top_k: int = 4
    retrieval_candidates: int = 10
    rrf_k: int = 60
    max_vector_distance: float = 0.42
    min_bm25_score: float = 1.5
    chunk_max_chars: int = 900

    # Firm details used in canned replies (sample content)
    firm_name: str = "Amber & Pea Law"
    firm_phone: str = "(555) 010-0142"
    booking_path: str = "/book"

    @field_validator("cors_allowed_origins")
    @classmethod
    def _no_wildcards(cls, v: str) -> str:
        origins = [o.strip() for o in v.split(",") if o.strip()]
        if not origins:
            raise ValueError("CORS_ALLOWED_ORIGINS must list at least one origin")
        if any("*" in o for o in origins):
            raise ValueError("CORS_ALLOWED_ORIGINS must not contain wildcards")
        return ",".join(origins)

    @property
    def cors_origins(self) -> list[str]:
        return self.cors_allowed_origins.split(",")

    def resolve_path(self, value: str) -> Path:
        """Resolves relative paths against the ai-service folder, so commands work from any directory."""
        p = Path(value)
        return p if p.is_absolute() else (SERVICE_DIR / p).resolve()

    @property
    def knowledge_base_path(self) -> Path:
        return self.resolve_path(self.knowledge_base_dir)

    @property
    def chroma_persist_path(self) -> Path:
        return self.resolve_path(self.chroma_path)


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
