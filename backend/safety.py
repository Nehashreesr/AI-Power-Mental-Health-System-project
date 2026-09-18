CRISIS_KEYWORDS = [
    "kill myself",
    "killing myself",
    "suicide",
    "suicidal",
    "end my life",
    "want to die",
    "don't want to live",
    "do not want to live",
    "hurt myself",
    "harm myself",
    "self harm",
    "self-harm"
]

def check_crisis(message):
    text = message.lower()
    return any(keyword in text for keyword in CRISIS_KEYWORDS)

def crisis_response():
    return (
        "I'm really sorry you're going through something this difficult. "
        "I can't provide emergency or medical care, but you don't have to "
        "handle this alone. Please contact a trusted person who can stay "
        "with you and reach out to a local emergency service or qualified "
        "mental-health professional now. If you are in immediate danger, "
        "please go to the nearest emergency department or call your local "
        "emergency number."
    )
