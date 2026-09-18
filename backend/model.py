
import os

from dotenv import load_dotenv
from openai import OpenAI


# =====================================================
# BACKEND DIRECTORY
# =====================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)


# =====================================================
# .ENV FILE
# =====================================================

ENV_FILE = os.path.join(
    BASE_DIR,
    ".env"
)


# =====================================================
# LOAD ENVIRONMENT VARIABLES
# =====================================================

load_dotenv(ENV_FILE)


# =====================================================
# HUGGING FACE CONFIGURATION
# =====================================================

HF_TOKEN = os.getenv("HF_TOKEN")

HF_MODEL = os.getenv(
    "HF_MODEL",
    "openai/gpt-oss-20b"
)


# =====================================================
# CHECK TOKEN
# =====================================================

if not HF_TOKEN:

    raise RuntimeError(
        f"HF_TOKEN is not set. "
        f"Please check: {ENV_FILE}"
    )


print("================================")
print("MindCare AI - Hugging Face")
print("================================")
print("ENV FILE:", ENV_FILE)
print("TOKEN FOUND: YES")
print("MODEL:", HF_MODEL)
print("================================")


# =====================================================
# HUGGING FACE OPENAI CLIENT
# =====================================================

client = OpenAI(

    base_url="https://router.huggingface.co/v1",

    api_key=HF_TOKEN,

    timeout=60.0
)


# =====================================================
# SYSTEM PROMPT
# =====================================================

SYSTEM_PROMPT = """
You are MindCare AI, a supportive general wellness companion.

Your job is to provide short, empathetic and supportive responses.

You can help users with:
- sadness
- stress
- loneliness
- anxiety about everyday situations
- motivation
- study pressure
- relationship difficulties
- general emotional wellbeing

Rules:

1. Be warm, calm and non-judgmental.
2. Keep normal responses concise.
3. Ask a simple follow-up question when appropriate.
4. Do not diagnose mental-health conditions.
5. Do not prescribe medication.
6. Do not claim to be a doctor, therapist or medical professional.
7. Do not make medical diagnoses.
8. If the user describes immediate danger or self-harm,
   encourage them to contact emergency services,
   a trusted person, or a qualified mental-health professional.
9. Never shame or judge the user.
10. Focus on supportive, practical and safe suggestions.

Example style:

User:
"I am feeling sad."

Good response:
"I'm sorry you're feeling this way. You don't have to handle
everything alone. Would you like to tell me what has been making
you feel sad today?"

Keep responses short and natural.
"""


# =====================================================
# GENERATE RESPONSE
# =====================================================

def generate_response(
    user_message,
    chat_history=None
):

    try:

        print("\n================================")
        print("         CHAT REQUEST")
        print("================================")

        print("User message:", user_message)


        # =================================================
        # BUILD MESSAGES
        # =================================================

        messages = [

            {
                "role": "system",
                "content": SYSTEM_PROMPT
            }

        ]


        # =================================================
        # ADD CHAT HISTORY
        # =================================================

        if isinstance(chat_history, list):

            for item in chat_history[-6:]:

                if not isinstance(item, dict):
                    continue

                role = item.get("role")

                content = item.get(
                    "content",
                    ""
                )

                if not isinstance(content, str):
                    continue

                content = content.strip()

                if (
                    role in ["user", "assistant"]
                    and content
                ):

                    messages.append({

                        "role": role,

                        "content": content

                    })


        # =================================================
        # CURRENT USER MESSAGE
        # =================================================

        messages.append({

            "role": "user",

            "content": user_message

        })


        # =================================================
        # SEND REQUEST TO HUGGING FACE
        # =================================================

        print("Sending request to Hugging Face...")
        print("Model:", HF_MODEL)

        response = client.chat.completions.create(

            model=HF_MODEL,

            messages=messages,

            max_tokens=180,

            temperature=0.6

        )


        # =================================================
        # CHECK RESPONSE
        # =================================================

        if not response:

            print("ERROR: Empty API response")

            return (
                "I'm here to listen. "
                "Could you tell me a little more "
                "about how you're feeling?"
            )


        if not response.choices:

            print("ERROR: No choices returned")

            return (
                "I'm here to listen. "
                "Could you tell me a little more?"
            )


        # =================================================
        # GET MESSAGE
        # =================================================

        reply = response.choices[0].message.content


        if not reply:

            print("ERROR: Empty AI message")

            return (
                "I'm here to listen. "
                "Tell me a little more about "
                "how you're feeling."
            )


        reply = reply.strip()


        print("AI RESPONSE:", reply)
        print("================================\n")


        return reply


    except Exception as e:

        print("\n================================")
        print("       HUGGING FACE ERROR")
        print("================================")
        print(type(e).__name__)
        print(str(e))
        print("================================\n")

        raise

