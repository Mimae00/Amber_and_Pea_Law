import pytest

from app.chat import ChatService, extractive_answer
from app.guardrails import ADVICE_PREFIX
from app.retrieval import Hit, HybridRetriever
from tests.conftest import FakeLLM


async def collect(service: ChatService, question: str, history=None):
    events = [e async for e in service.answer(question, history or [])]
    text = "".join(e.data["text"] for e in events if e.name == "token")
    return events, text


def build(collection, embedder, settings, llm):
    return ChatService(HybridRetriever(collection, embedder, settings), llm, settings)


@pytest.mark.anyio
async def test_llm_answer_streams_with_citations_first(collection, embedder, settings):
    llm = FakeLLM()
    events, text = await collect(build(collection, embedder, settings, llm), "What are your office hours?")

    assert [e.name for e in events][0] == "meta" and events[-1].name == "done"
    assert events[-1].data["mode"] == "llm"
    cites = events[0].data["citations"]
    assert cites[0]["n"] == 1 and cites[0]["url"] == "/contact"
    assert "Monday to Friday" in text
    # Prompt contains the retrieved context and the no-advice rules.
    system = llm.calls[0][0]["content"]
    assert "Never give legal advice" in system and "[1] Our office is open" in system


@pytest.mark.anyio
async def test_leading_bare_citation_from_small_models_is_stripped(collection, embedder, settings):
    llm = FakeLLM(tokens=["[1] ", "Our office ", "is open Monday to Friday. [1]"])
    _, text = await collect(build(collection, embedder, settings, llm), "office hours?")
    assert text.startswith("Our office")
    assert text.endswith("[1]")


@pytest.mark.anyio
async def test_outcome_question_never_reaches_llm(collection, embedder, settings):
    llm = FakeLLM()
    events, text = await collect(build(collection, embedder, settings, llm), "Will I win custody?")
    assert llm.calls == []
    assert "can't predict or promise" in text
    assert events[0].data["suggest_booking"] is True
    assert events[-1].data["mode"] == "canned"


@pytest.mark.anyio
async def test_advice_question_starts_with_disclaimer(collection, embedder, settings):
    llm = FakeLLM(tokens=["We help parents with custody. [1]"])
    events, text = await collect(build(collection, embedder, settings, llm), "Do I have a case for child custody?")
    assert text.startswith(ADVICE_PREFIX)
    assert events[0].data["suggest_booking"] is True
    assert "already been shown" in llm.calls[0][0]["content"]


@pytest.mark.anyio
async def test_emergency_reply_mentions_911(collection, embedder, settings):
    _, text = await collect(build(collection, embedder, settings, FakeLLM()), "I am in danger right now")
    assert "911" in text and "988" in text


@pytest.mark.anyio
async def test_unknown_topic_says_not_found_and_offers_booking(collection, embedder, settings):
    llm = FakeLLM()
    events, text = await collect(build(collection, embedder, settings, llm), "What is the capital of France?")
    assert llm.calls == []
    assert "don't have that information" in text
    assert events[0].data["intent"] == "not_found" and events[0].data["suggest_booking"] is True


@pytest.mark.anyio
async def test_no_llm_mode_returns_best_passage(collection, embedder, settings):
    events, text = await collect(build(collection, embedder, settings, None), "What are your office hours?")
    assert events[-1].data["mode"] == "extractive"
    assert "Monday to Friday" in text and text.endswith("[1]")
    assert len(events[0].data["citations"]) == 1


@pytest.mark.anyio
async def test_llm_down_falls_back_to_passage(collection, embedder, settings):
    events, text = await collect(build(collection, embedder, settings, FakeLLM(fail=True)), "office hours")
    assert events[-1].name == "done" and events[-1].data["mode"] == "extractive_fallback"
    assert "Monday to Friday" in text


@pytest.mark.anyio
async def test_llm_failing_mid_stream_emits_error(collection, embedder, settings):
    llm = FakeLLM(tokens=["Our office is ", "open on weekdays ", "and more text"], fail_after=2)
    events, _ = await collect(build(collection, embedder, settings, llm), "office hours")
    assert events[-1].name == "error"


@pytest.mark.anyio
async def test_history_is_limited(collection, embedder, settings):
    llm = FakeLLM()
    history = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"m{i}"} for i in range(20)]
    await collect(build(collection, embedder, settings, llm), "office hours", history)
    sent = llm.calls[0]
    assert sent[0]["role"] == "system" and sent[-1] == {"role": "user", "content": "office hours"}
    assert len(sent) == 1 + 6 + 1


def test_extractive_answer_trims_to_sentences():
    long = "Title - Section\n\n" + " ".join(f"Sentence number {i} is here." for i in range(40))
    out = extractive_answer([Hit(id="x", text=long, metadata={}, score=1.0)], max_chars=120)
    body = out.removeprefix("Here's what our site says: ").removesuffix(" [1]")
    assert len(body) <= 120 and body.endswith(".")
    assert "Title - Section" not in out
