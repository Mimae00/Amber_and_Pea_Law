"""Markdown chunking: one chunk per heading section, long sections split on paragraphs."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

_HEADING = re.compile(r"^(#{1,3})\s+(.+?)\s*#*\s*$")


@dataclass(frozen=True)
class Chunk:
    id: str
    text: str
    metadata: dict[str, str] = field(default_factory=dict)


def parse_front_matter(raw: str) -> tuple[dict[str, str], str]:
    """Parses a simple `key: value` front-matter block delimited by --- lines."""
    lines = raw.lstrip("\ufeff").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, raw
    meta: dict[str, str] = {}
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            return meta, "\n".join(lines[i + 1 :])
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip().strip('"').strip("'")
    return {}, raw  # unterminated block: treat as plain content


def _split_long(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    parts: list[str] = []
    current = ""
    for para in re.split(r"\n\s*\n", text):
        para = para.strip()
        if not para:
            continue
        if current and len(current) + len(para) + 2 > max_chars:
            parts.append(current)
            current = para
        else:
            current = f"{current}\n\n{para}" if current else para
    if current:
        parts.append(current)
    return parts


_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)


def chunk_markdown(raw: str, source: str, max_chars: int = 900) -> list[Chunk]:
    meta, body = parse_front_matter(raw)
    body = _COMMENT.sub("", body)  # editor notes in HTML comments are not indexed
    doc_title = meta.get("title", source)
    url = meta.get("url", "")

    sections: list[tuple[str, list[str]]] = []
    heading = ""
    buf: list[str] = []
    for line in body.splitlines():
        m = _HEADING.match(line)
        if m:
            if any(s.strip() for s in buf):
                sections.append((heading, buf))
            level, text = len(m.group(1)), m.group(2).strip()
            if level == 1 and not meta.get("title"):
                doc_title = text
            heading = "" if level == 1 else text
            buf = []
        else:
            buf.append(line)
    if any(s.strip() for s in buf):
        sections.append((heading, buf))

    chunks: list[Chunk] = []
    for heading, lines in sections:
        content = "\n".join(lines).strip()
        for part in _split_long(content, max_chars):
            # The title and heading are part of the text so both BM25 and embeddings can match them.
            header = f"{doc_title} - {heading}" if heading else doc_title
            chunks.append(
                Chunk(
                    id=f"{source}#{len(chunks)}",
                    text=f"{header}\n\n{part}",
                    metadata={"source": source, "title": doc_title, "section": heading, "url": url},
                )
            )
    return chunks


def load_knowledge_base(directory: Path, max_chars: int = 900) -> list[Chunk]:
    if not directory.is_dir():
        raise FileNotFoundError(f"Knowledge base directory not found: {directory}")
    chunks: list[Chunk] = []
    for path in sorted(directory.glob("*.md")):
        if path.name.lower() == "readme.md":
            continue
        chunks.extend(chunk_markdown(path.read_text(encoding="utf-8"), path.name, max_chars))
    return chunks
