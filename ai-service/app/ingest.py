"""Indexes knowledge-base/*.md into ChromaDB.

Usage (from the repo root):
    ai-service\\.venv\\Scripts\\python knowledge-base\\ingest.py
or from ai-service/:
    .venv\\Scripts\\python -m app.ingest

The collection is replaced on each run. Restart the AI service afterwards so it reloads the index.
"""

from __future__ import annotations

import argparse
import logging
import sys
import time

from .chunking import load_knowledge_base
from .config import get_settings
from .embeddings import EmbeddingError, create_embedder
from .vector_store import create_client, get_collection

log = logging.getLogger("ingest")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Index the knowledge base into ChromaDB")
    parser.add_argument("--dry-run", action="store_true", help="Only chunk and print, do not embed or store")
    args = parser.parse_args(argv)

    logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    s = get_settings()

    kb = s.knowledge_base_path
    chunks = load_knowledge_base(kb, s.chunk_max_chars)
    files = sorted({c.metadata["source"] for c in chunks})
    log.info("Loaded %d chunks from %d files in %s", len(chunks), len(files), kb)
    if not chunks:
        log.error("No markdown files found")
        return 1
    if args.dry_run:
        for c in chunks:
            print(f"--- {c.id} ({len(c.text)} chars) url={c.metadata['url']}")
        return 0

    started = time.perf_counter()
    try:
        embeddings = create_embedder(s).embed_documents([c.text for c in chunks])
    except EmbeddingError as e:
        log.error("%s", e)
        if s.embedding_provider == "ollama":
            log.error("Is Ollama running, and did you run: ollama pull %s", s.embedding_model)
        return 2

    client = create_client(s)
    try:
        client.delete_collection(s.chroma_collection)
    except Exception:  # noqa: BLE001 - collection may not exist yet
        pass
    collection = get_collection(client, s)
    collection.add(
        ids=[c.id for c in chunks],
        documents=[c.text for c in chunks],
        metadatas=[c.metadata for c in chunks],
        embeddings=embeddings,
    )
    log.info(
        "Indexed %d chunks into '%s' (%s mode, %s embeddings, dim=%d) in %.1fs",
        collection.count(),
        s.chroma_collection,
        s.chroma_mode,
        s.embedding_provider,
        len(embeddings[0]),
        time.perf_counter() - started,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
