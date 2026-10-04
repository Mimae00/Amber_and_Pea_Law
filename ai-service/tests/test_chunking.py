from pathlib import Path

from app.chunking import chunk_markdown, load_knowledge_base, parse_front_matter

DOC = """---
title: Fees and Free Consultation
url: /book
---

# Fees

<!-- Sample content note: not indexed -->

## Free consultation

The first consultation is free.

## Payment

We accept cards.
"""


def test_front_matter_is_parsed():
    meta, body = parse_front_matter(DOC)
    assert meta == {"title": "Fees and Free Consultation", "url": "/book"}
    assert body.lstrip().startswith("# Fees")


def test_missing_or_unterminated_front_matter_is_plain_content():
    assert parse_front_matter("# Title\n\ntext") == ({}, "# Title\n\ntext")
    raw = "---\ntitle: x\nno end"
    assert parse_front_matter(raw) == ({}, raw)


def test_one_chunk_per_section_with_metadata_and_header():
    chunks = chunk_markdown(DOC, "fees.md")
    assert [c.metadata["section"] for c in chunks] == ["Free consultation", "Payment"]
    first = chunks[0]
    assert first.id == "fees.md#0"
    assert first.metadata == {"source": "fees.md", "title": "Fees and Free Consultation", "section": "Free consultation", "url": "/book"}
    # Title and section are part of the text so BM25 and embeddings can match them.
    assert first.text.startswith("Fees and Free Consultation - Free consultation\n\n")


def test_html_comments_are_not_indexed():
    assert all("Sample content note" not in c.text for c in chunk_markdown(DOC, "fees.md"))


def test_long_sections_split_on_paragraphs():
    paras = "\n\n".join(f"Paragraph {i} " + "word " * 40 for i in range(6))
    chunks = chunk_markdown(f"# T\n\n## Long\n\n{paras}", "long.md", max_chars=500)
    assert len(chunks) > 1
    assert all(len(c.text.split("\n\n", 1)[1]) <= 500 for c in chunks)
    assert len({c.id for c in chunks}) == len(chunks)


def test_real_knowledge_base_loads_and_skips_readme():
    kb = Path(__file__).resolve().parents[2] / "knowledge-base"
    chunks = load_knowledge_base(kb)
    sources = {c.metadata["source"] for c in chunks}
    assert "README.md" not in sources
    assert {"faq.md", "fees-and-consultation.md", "office-hours-and-location.md"} <= sources
    assert all(c.metadata["url"].startswith("/") for c in chunks)
    assert not any("Sample content" in c.text for c in chunks)
