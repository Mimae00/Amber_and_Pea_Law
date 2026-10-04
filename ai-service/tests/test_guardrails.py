import pytest

from app.guardrails import Intent, assess


@pytest.mark.parametrize(
    "message",
    [
        "Will I win my case?",
        "What's my case worth?",
        "How much will I get for my car accident settlement?",
        "Can you guarantee I get custody?",
        "What are my chances of winning custody?",
        "How likely is it that I win?",
    ],
)
def test_outcome_questions(message):
    a = assess(message)
    assert a.intent == Intent.OUTCOME
    assert a.suggest_booking and a.suggest_contact


@pytest.mark.parametrize(
    "message",
    [
        "Do I have a case? I slipped in a store.",
        "Should I accept the insurance offer?",
        "Can I sue my landlord?",
        "Am I at fault for the accident?",
        "What should I do about my ex?",
        "I need legal advice",
        "What are my rights after a divorce?",
    ],
)
def test_advice_questions(message):
    a = assess(message)
    assert a.intent == Intent.ADVICE
    assert a.suggest_booking


@pytest.mark.parametrize(
    "message",
    ["I am in danger right now", "My husband is threatening to hurt me", "I want to kill myself"],
)
def test_emergencies(message):
    assert assess(message).intent == Intent.EMERGENCY


@pytest.mark.parametrize("message", ["hi", "Hello!", "thanks", "Good morning"])
def test_greetings(message):
    a = assess(message)
    assert a.intent == Intent.GREETING
    assert not a.suggest_booking


def test_general_questions_and_contact_intent():
    plain = assess("What are your office hours?")
    assert plain.intent == Intent.QUESTION and not plain.suggest_booking
    contact = assess("Can I speak to a lawyer about fees?")
    assert contact.intent == Intent.QUESTION and contact.suggest_booking and contact.suggest_contact
    book = assess("How do I book a consultation?")
    assert book.suggest_booking
