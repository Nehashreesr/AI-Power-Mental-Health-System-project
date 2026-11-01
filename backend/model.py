
import json
import threading
import urllib.request
import urllib.error


# =====================================================
# OLLAMA CONFIGURATION
# =====================================================

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "llama3.2:3b"

# Keep the model loaded in memory between requests so the first
# message after a pause is not slowed down by a model reload.
OLLAMA_KEEP_ALIVE = "30m"


print("================================")
print("MindCare AI - Ollama (Local)")
print("Model:", OLLAMA_MODEL)
print("Hugging Face API: Not required")
print("================================")


# =====================================================
# SYSTEM PROMPT
# =====================================================

SYSTEM_PROMPT = """
You are MindCare AI, a supportive general wellness companion.

Help users with everyday sadness, stress, loneliness, motivation,
study pressure, relationship difficulties, and emotional wellbeing.

Rules:
1. Be warm, calm, empathetic, and non-judgmental.
2. Keep responses short, clear, and natural.
3. Ask a simple follow-up question when appropriate.
4. Do not diagnose mental-health conditions or prescribe medication.
5. Never claim to be a doctor or therapist.
6. Offer practical, safe wellness suggestions.
7. For immediate danger or self-harm, encourage contacting
   emergency services, a trusted person, or a qualified professional.
8. This is general wellness support, not a medical service.
"""


# =====================================================
# GENERATE RESPONSE USING LOCAL OLLAMA MODEL
# =====================================================

def generate_response(user_message, chat_history=None):

    print("\n================================")
    print("CHAT REQUEST - OLLAMA")
    print("================================")
    print("User message:", user_message)

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        }
    ]

    # Add recent conversation history.
    if isinstance(chat_history, list):

        for item in chat_history[-6:]:

            if not isinstance(item, dict):
                continue

            role = item.get("role")
            content = item.get("content", "")

            if not isinstance(content, str):
                continue

            content = content.strip()

            if role in ("user", "assistant") and content:
                messages.append({
                    "role": role,
                    "content": content
                })

    # Add the current message.
    messages.append({
        "role": "user",
        "content": user_message
    })

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "keep_alive": OLLAMA_KEEP_ALIVE,
        "options": {
            "temperature": 0.6,
            "num_predict": 180
        }
    }

    request_body = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        OLLAMA_URL,
        data=request_body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:

        with urllib.request.urlopen(req, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))

        reply = result.get("message", {}).get("content", "").strip()

        if not reply:
            raise RuntimeError("Ollama returned an empty response.")

        print("AI RESPONSE:", reply)
        print("================================\n")

        return reply

    except urllib.error.URLError as e:

        print("OLLAMA CONNECTION ERROR:", str(e))

        raise RuntimeError(
            "Could not connect to Ollama. Check that Ollama is "
            "running at http://127.0.0.1:11434 and that the model "
            "llama3.2:3b is installed."
        ) from e

    except Exception as e:

        print("OLLAMA ERROR:", type(e).__name__, str(e))
        raise


# =====================================================
# WARM UP MODEL AT STARTUP (background, non-blocking)
# =====================================================
# Loads llama3.2:3b into memory before the first chat message so the
# first reply is as fast as every other reply.

def _warm_up():

    try:

        payload = {
            "model": OLLAMA_MODEL,
            "messages": [],
            "stream": False,
            "keep_alive": OLLAMA_KEEP_ALIVE
        }

        req = urllib.request.Request(
            OLLAMA_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=180):
            pass

        print("Ollama model warmed up")

    except Exception as e:

        print("Ollama warm-up skipped:", str(e))


def warm_up_model():

    threading.Thread(target=_warm_up, daemon=True).start()
