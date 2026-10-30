"""Specialty guidance for appointment visit reasons.

Each hospital department accepts a different kind of concern. The rules below
describe the topic that a department handles, a few patient friendly examples,
and the words that identify that topic. A reason is rejected only when it
clearly belongs to a different department. General Medicine has no rule, so it
accepts any reason.
"""

import re

SPECIALTY_REASON_RULES = {
    "Dermatology": {
        "topic": "skin, hair, or nail concerns",
        "examples": "acne, skin rash, hair loss, eczema, or a mole check",
        "keywords": (
            "acne",
            "skin",
            "rash",
            "hair",
            "nail",
            "eczema",
            "dermatitis",
            "mole",
            "lesion",
            "psoriasis",
            "pigmentation",
            "dandruff",
        ),
    },
    "Cardiology": {
        "topic": "heart or blood pressure concerns",
        "examples": "chest pain, high blood pressure, palpitations, or a cardiac review",
        "keywords": (
            "heart",
            "cardiac",
            "chest pain",
            "blood pressure",
            "palpitation",
            "hypertension",
            "cholesterol",
            "ecg",
            "angina",
        ),
    },
    "Paediatrics": {
        "topic": "child health concerns",
        "examples": "child fever, vaccination, growth review, or a child cough",
        "keywords": (
            "child",
            "infant",
            "baby",
            "paediatric",
            "pediatric",
            "vaccination",
            "growth",
            "newborn",
            "toddler",
        ),
    },
    "Orthopaedics": {
        "topic": "bone, joint, or muscle concerns",
        "examples": "joint pain, back pain, a fracture, a sprain, or arthritis",
        "keywords": (
            "bone",
            "joint",
            "muscle",
            "fracture",
            "sprain",
            "back pain",
            "knee",
            "shoulder",
            "arthritis",
            "ligament",
            "sports injury",
        ),
    },
    "Ear Nose and Throat": {
        "topic": "ear, nose, or throat concerns",
        "examples": "sore throat, ear pain, sinus trouble, hearing loss, or tonsils",
        "keywords": (
            "ear",
            "nose",
            "throat",
            "sinus",
            "hearing",
            "tonsil",
            "voice",
            "snoring",
            "vertigo",
            "nosebleed",
            "hoarseness",
        ),
    },
}


def _matches(text, keywords):
    """Match whole words so that 'heart' does not match 'hearing'."""
    pattern = r"\b(?:" + "|".join(re.escape(keyword) for keyword in keywords) + r")(?:s|es)?\b"
    return re.search(pattern, text) is not None


def reason_mismatch(department_name, reason):
    """Return a guidance message when a reason belongs to another specialty.

    Returns None when the reason is acceptable, the department has no rule, or
    the reason does not clearly match a different specialty.
    """
    rule = SPECIALTY_REASON_RULES.get(department_name)
    if rule is None or not reason or not reason.strip():
        return None

    text = reason.lower()
    if _matches(text, rule["keywords"]):
        return None

    for other_department, other_rule in SPECIALTY_REASON_RULES.items():
        if other_department == department_name:
            continue
        if _matches(text, other_rule["keywords"]):
            return (
                f"This looks like a concern for {other_department} ({other_rule['topic']}). "
                f"{department_name} handles {rule['topic']}. "
                f"Please book {other_department} or describe a concern that fits {department_name}."
            )
    return None
