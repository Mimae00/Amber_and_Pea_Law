"""ChromaDB client factory: embedded persistent mode (local) or HTTP client mode (remote server)."""

from __future__ import annotations

import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection
from chromadb.config import Settings as ChromaSettings

from .config import Settings


def create_client(settings: Settings) -> ClientAPI:
    chroma_settings = ChromaSettings(anonymized_telemetry=False)
    if settings.chroma_mode == "http":
        return chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
            ssl=settings.chroma_ssl,
            settings=chroma_settings,
        )
    path = settings.chroma_persist_path
    path.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(path), settings=chroma_settings)


def get_collection(client: ClientAPI, settings: Settings) -> Collection:
    """Embeddings are always computed by this service and passed explicitly, so no embedding function is attached."""
    return client.get_or_create_collection(
        name=settings.chroma_collection,
        embedding_function=None,
        configuration={"hnsw": {"space": "cosine"}},
    )
