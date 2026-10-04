"""Prompt construction. Kept short and explicit so small local models follow it."""

from __future__ import annotations

from .llm import Message
from .retrieval import Hit


def _body(text: str) -> str:
    # Chunks start with a "Title - Section" header line; small models tend to echo it, so it is moved after the text.
    parts = text.split("\n\n", 1)
    return parts[1].strip() if len(parts) == 2 else text.strip()


def _context_block(hits: list[Hit]) -> str:
    parts = []
    for n, h in enumerate(hits, start=1):
        label = h.metadata.get("title", "")
        if h.metadata.get("section"):
            label = f"{label}, {h.metadata['section']}"
        parts.append(f"[{n}] {_body(h.text)}\n(source: {label})")
    return "\n\n".join(parts)


def system_prompt(firm_name: str, firm_phone: str, hits: list[Hit], advice_requested: bool) -> str:
    rules = [
        f"You are the website assistant for {firm_name}, a personal injury and family law firm.",
        "Answer ONLY with facts from the CONTEXT below. If the answer is not in the CONTEXT, say you don't have that "
        f"information and suggest calling {firm_phone} or booking a free consultation.",
        "Never give legal advice. Never assess the visitor's case. Never predict or promise outcomes, amounts or timelines.",
        "Keep answers to 2-4 short sentences in plain language.",
        "Answer the question directly. Do not repeat source names. End each sentence that uses the CONTEXT with its "
        "number in square brackets, like [1].",
        "Do not ask for personal or confidential details in the chat.",
    ]
    if advice_requested:
        rules.append(
            "The visitor asked about their own situation. The disclaimer has already been shown. "
            "Share only general information from the CONTEXT and suggest a free consultation."
        )
    return "\n".join(f"- {r}" for r in rules) + "\n\nCONTEXT:\n" + _context_block(hits)


def build_messages(
    firm_name: str,
    firm_phone: str,
    hits: list[Hit],
    history: list[Message],
    question: str,
    advice_requested: bool,
    max_history: int = 6,
) -> list[Message]:
    messages: list[Message] = [
        {"role": "system", "content": system_prompt(firm_name, firm_phone, hits, advice_requested)}
    ]
    messages.extend(history[-max_history:])
    messages.append({"role": "user", "content": question})
    return messages
