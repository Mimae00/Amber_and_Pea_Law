from app.embeddings import EmbeddingError, _with_prefix
from app.retrieval import HybridRetriever, reciprocal_rank_fusion, tokenize


def test_tokenize_drops_stopwords_and_normalizes_plurals():
    assert tokenize("What are your FEES and office hours?") == ["fee", "office", "hour"]
    assert tokenize("parties process") == ["party", "process"]
    assert tokenize("the and of") == []


def test_rrf_rewards_documents_ranked_high_in_both_lists():
    scores = reciprocal_rank_fusion([["a", "b", "c"], ["b", "a", "d"]], k=60)
    assert scores["a"] == scores["b"]  # 1/61 + 1/62 each
    assert scores["a"] > scores["c"] and scores["a"] > scores["d"]
    assert set(scores) == {"a", "b", "c", "d"}
    assert abs(scores["c"] - 1 / 63) < 1e-12


def test_embedding_prefix():
    assert _with_prefix("search_query:", "hours") == "search_query: hours"
    assert _with_prefix("", "hours") == "hours"


def test_hybrid_search_finds_relevant_chunk(collection, embedder, settings):
    r = HybridRetriever(collection, embedder, settings)
    assert r.load() == 4
    # "monday" is specific to one chunk. (In this 4-doc corpus "office"/"hours" appear in half the
    # documents, which gives them zero BM25 IDF; that is expected BM25 behaviour.)
    hits = r.search("Are you open on Monday? What are your office hours?")
    assert hits[0].id == "hours#0"
    assert hits[0].vector_rank is not None and hits[0].bm25_rank is not None
    assert r.is_relevant(hits)
    assert len(hits) <= settings.retrieval_top_k


def test_keyword_only_match_still_ranks(collection, embedder, settings):
    r = HybridRetriever(collection, embedder, settings)
    hits = r.search("parenting plans")  # words not in the fake embedder vocabulary
    assert hits[0].id == "family#0"
    assert hits[0].bm25_score and hits[0].bm25_score > 0


def test_off_topic_question_fails_relevance_gate(collection, embedder, settings):
    r = HybridRetriever(collection, embedder, settings)
    hits = r.search("What is the capital of France?")
    assert not r.is_relevant(hits)


def test_falls_back_to_bm25_when_embeddings_fail(collection, settings):
    class Broken:
        def embed_query(self, text):
            raise EmbeddingError("ollama down")

    r = HybridRetriever(collection, Broken(), settings)
    hits = r.search("child custody")
    assert hits and hits[0].id == "family#0"
    assert all(h.vector_rank is None for h in hits)


def test_empty_collection_returns_no_hits(embedder, settings):
    from tests.conftest import FakeCollection

    r = HybridRetriever(FakeCollection({}, embedder), embedder, settings)
    assert r.search("hours") == []
    assert not r.ensure_loaded()
