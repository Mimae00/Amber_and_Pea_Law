"""Hybrid retrieval: ChromaDB vector search + BM25 keyword search, merged with Reciprocal Rank Fusion."""

from __future__ import annotations

import logging
import re
import threading
from dataclasses import dataclass

from rank_bm25 import BM25Okapi

from .config import Settings
from .embeddings import Embedder, EmbeddingError

log = logging.getLogger(__name__)

_STOPWORDS = frozenset(
    """a an and are as at be but by can do does for from have how i if in is it its me my of on or our
    so that the their them there this to us was we what when where which who why will with you your
    am been being did has had having he her him his she they than then these those too very would could
    should about any into just also get got""".split()
)
_TOKEN = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    """Lowercase word tokens without stopwords, with light plural stripping (fees -> fee)."""
    tokens = []
    for t in _TOKEN.findall(text.lower()):
        if t in _STOPWORDS:
            continue
        if len(t) > 4 and t.endswith("ies"):
            t = t[:-3] + "y"
        elif len(t) > 3 and t.endswith("s") and not t.endswith("ss"):
            t = t[:-1]
        tokens.append(t)
    return tokens


@dataclass
class Hit:
    id: str
    text: str
    metadata: dict[str, str]
    score: float  # fused RRF score
    vector_rank: int | None = None
    vector_distance: float | None = None
    bm25_rank: int | None = None
    bm25_score: float | None = None


def reciprocal_rank_fusion(rankings: list[list[str]], k: int = 60) -> dict[str, float]:
    """score(d) = sum over rankings of 1 / (k + rank), rank starting at 1."""
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank)
    return scores


class HybridRetriever:
    def __init__(self, collection, embedder: Embedder, settings: Settings) -> None:
        self._collection = collection
        self._embedder = embedder
        self._settings = settings
        self._lock = threading.Lock()
        self._ids: list[str] = []
        self._docs: dict[str, tuple[str, dict[str, str]]] = {}
        self._bm25: BM25Okapi | None = None

    @property
    def size(self) -> int:
        return len(self._ids)

    def load(self) -> int:
        """(Re)builds the in-memory BM25 index from the collection, which stays the single source of truth."""
        data = self._collection.get(include=["documents", "metadatas"])
        ids = list(data["ids"])
        docs = {
            i: (doc or "", dict(meta or {}))
            for i, doc, meta in zip(ids, data["documents"] or [], data["metadatas"] or [])
        }
        bm25 = BM25Okapi([tokenize(docs[i][0]) for i in ids]) if ids else None
        with self._lock:
            self._ids, self._docs, self._bm25 = ids, docs, bm25
        log.info("Retriever loaded %d chunks", len(ids))
        return len(ids)

    def ensure_loaded(self) -> bool:
        if not self._ids:
            self.load()
        return bool(self._ids)

    def _bm25_search(self, query: str, n: int) -> list[tuple[str, float]]:
        with self._lock:
            bm25, ids = self._bm25, self._ids
        tokens = tokenize(query)
        if bm25 is None or not tokens:
            return []
        scores = bm25.get_scores(tokens)
        ranked = sorted(zip(ids, scores), key=lambda x: x[1], reverse=True)
        return [(i, float(s)) for i, s in ranked[:n] if s > 0]

    def _vector_search(self, query: str, n: int) -> list[tuple[str, float]]:
        embedding = self._embedder.embed_query(query)
        res = self._collection.query(query_embeddings=[embedding], n_results=min(n, max(1, self.size)), include=["distances"])
        return list(zip(res["ids"][0], map(float, res["distances"][0])))

    def search(self, query: str) -> list[Hit]:
        if not self.ensure_loaded():
            return []
        n = self._settings.retrieval_candidates
        try:
            vector = self._vector_search(query, n)
        except EmbeddingError as e:
            # Keep answering with keyword search if the embedding model is unavailable.
            log.warning("Vector search unavailable, using BM25 only: %s", e)
            vector = []
        keyword = self._bm25_search(query, n)
        fused = reciprocal_rank_fusion([[i for i, _ in vector], [i for i, _ in keyword]], k=self._settings.rrf_k)

        v_info = {i: (rank, d) for rank, (i, d) in enumerate(vector, start=1)}
        k_info = {i: (rank, s) for rank, (i, s) in enumerate(keyword, start=1)}
        hits: list[Hit] = []
        for doc_id, score in sorted(fused.items(), key=lambda x: x[1], reverse=True)[: self._settings.retrieval_top_k]:
            text, meta = self._docs.get(doc_id, ("", {}))
            v, kw = v_info.get(doc_id), k_info.get(doc_id)
            hits.append(
                Hit(
                    id=doc_id,
                    text=text,
                    metadata=meta,
                    score=score,
                    vector_rank=v[0] if v else None,
                    vector_distance=v[1] if v else None,
                    bm25_rank=kw[0] if kw else None,
                    bm25_score=kw[1] if kw else None,
                )
            )
        return hits

    def is_relevant(self, hits: list[Hit]) -> bool:
        """Relevance gate: avoid answering from weak matches."""
        s = self._settings
        return any(
            (h.vector_distance is not None and h.vector_distance <= s.max_vector_distance)
            or (h.bm25_score is not None and h.bm25_score >= s.min_bm25_score)
            for h in hits
        )
