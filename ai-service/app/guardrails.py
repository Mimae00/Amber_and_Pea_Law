"""Deterministic checks that run before retrieval and the LLM.

The LLM is also instructed not to give advice, but these rules guarantee the disclaimer
appears for advice and outcome questions regardless of what the model generates.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class Intent(str, Enum):
    EMERGENCY = "emergency"
    OUTCOME = "outcome"  # predictions, guarantees, case value
    ADVICE = "advice"  # "should I...", "do I have a case"
    GREETING = "greeting"
    QUESTION = "question"


def _rx(*patterns: str) -> re.Pattern[str]:
    return re.compile("|".join(f"(?:{p})" for p in patterns), re.IGNORECASE)


_EMERGENCY = _rx(
    r"\b(in|immediate)\s+danger\b",
    r"\b(he|she|they|someone|partner|husband|wife|ex)\s+(is\s+)?(hitting|threatening|going to (hurt|kill))\b",
    r"\b(kill|hurt)\s+(myself|me)\b",
    r"\bsuicid",
    r"\bdomestic (violence|abuse)\b.*\b(now|right now|tonight)\b",
)
_OUTCOME = _rx(
    r"\bwill i (win|lose|get|receive)\b",
    r"\b(chances?|odds|likelihood) (of|that|to)\b.*\b(win|winning|custody|settlement|case)\b",
    r"\bhow much (is|could|would|will|can) (my|i|the)\b.*\b(worth|get|receive|settle|settlement|compensation)\b",
    r"\bwhat('?s| is) my case worth\b",
    r"\bguarantee",
    r"\bpromise\b",
    r"\bhow likely\b",
)
_ADVICE = _rx(
    r"\bshould i\b",
    r"\bdo i have a (case|claim)\b",
    r"\bcan i sue\b",
    r"\bis it (legal|illegal)\b",
    r"\bam i (liable|at fault|responsible|entitled)\b",
    r"\bwhat (should|do) i do\b",
    r"\b(my|our) (case|situation|accident|divorce|custody|ex)\b.*\?",
    r"\blegal advice\b",
    r"\bwhat are my (rights|options)\b",
)
_CONTACT = _rx(
    r"\b(talk|speak) (to|with) (a |an |someone|somebody|attorney|lawyer|person|human)",
    r"\b(book|schedule|make)\b.*\b(appointment|consultation|meeting|call)\b",
    r"\bconsultation\b",
    r"\bcall me\b",
    r"\bcontact (me|you|someone)\b",
    r"\bhire\b",
    r"\b(need|want) (a |an )?(lawyer|attorney|help)\b",
)
_GREETING = _rx(r"^\s*(hi|hello|hey|good (morning|afternoon|evening)|thanks|thank you|ok|okay)[\s!.,]*$")


@dataclass(frozen=True)
class Assessment:
    intent: Intent
    suggest_booking: bool
    suggest_contact: bool


def assess(message: str) -> Assessment:
    text = message.strip()
    wants_contact = bool(_CONTACT.search(text))
    if _EMERGENCY.search(text):
        return Assessment(Intent.EMERGENCY, suggest_booking=False, suggest_contact=False)
    if _OUTCOME.search(text):
        return Assessment(Intent.OUTCOME, suggest_booking=True, suggest_contact=True)
    if _ADVICE.search(text):
        return Assessment(Intent.ADVICE, suggest_booking=True, suggest_contact=True)
    if _GREETING.match(text):
        return Assessment(Intent.GREETING, suggest_booking=False, suggest_contact=False)
    return Assessment(Intent.QUESTION, suggest_booking=wants_contact, suggest_contact=wants_contact)


def emergency_reply(firm_phone: str) -> str:
    return (
        "If you or someone else is in immediate danger, please call 911 now. "
        "If you are thinking about harming yourself, you can call or text 988 (Suicide & Crisis Lifeline, US). "
        f"When you are safe, our team can talk with you at {firm_phone}."
    )


def outcome_reply(firm_name: str) -> str:
    return (
        "I can't predict or promise how a case will turn out, or what it might be worth. "
        "Every situation is different, and past results don't guarantee future outcomes. "
        f"An attorney at {firm_name} can review the details with you in a free consultation."
    )


ADVICE_PREFIX = (
    "I can't give legal advice about your specific situation; only an attorney who reviews the details can do that. "
    "Here is some general information that may help: "
)


def greeting_reply(firm_name: str) -> str:
    return (
        f"Hello! I'm the {firm_name} website assistant. I can answer general questions about our practice areas, "
        "fees, free consultations, office hours and location. How can I help?"
    )


def not_found_reply(firm_phone: str) -> str:
    return (
        "I don't have that information on our website. "
        f"Our team can help directly: call {firm_phone} or book a free consultation."
    )
