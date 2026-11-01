
CRISIS_KEYWORDS = [
    "kill myself",
    "killing myself",
    "kill me",
    "suicide",
    "suicidal",
    "end my life",
    "end it all",
    "ending it all",
    "want to die",
    "wanna die",
    "wish i was dead",
    "wish i were dead",
    "better off dead",
    "better off without me",
    "feel like dying",
    "don't want to live",
    "do not want to live",
    "don't want to be alive",
    "no reason to live",
    "can't go on",
    "cannot go on",
    "can't take it anymore",
    "hurt myself",
    "harm myself",
    "cut myself",
    "hang myself",
    "self harm",
    "self-harm",
    "overdose",
    "emergency",
    "in danger"
]
 
 
def check_crisis(message):
    # Treat curly apostrophes (common on phones) like normal ones
    text = (
        message.lower()
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u02bc", "'")
        .replace("`", "'")
    )
    text = " ".join(text.split())
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
 

