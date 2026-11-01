import os
import threading
import numpy as np
import librosa

from transformers import pipeline


# =====================================================
# MODEL SETTINGS
# =====================================================

MODEL_NAME = "superb/hubert-large-superb-er"

# Model is NOT loaded when Flask starts
emotion_classifier = None
_classifier_lock = threading.Lock()


# =====================================================
# LOAD MODEL ONLY WHEN NEEDED
# =====================================================

def get_emotion_classifier():

    global emotion_classifier

    if emotion_classifier is None:

        # Lock so two requests never load the model twice.
        with _classifier_lock:

            if emotion_classifier is None:

                print("\n================================")
                print("Loading voice emotion model...")
                print("================================")

                emotion_classifier = pipeline(
                    "audio-classification",
                    model=MODEL_NAME
                )

                print("Voice emotion model loaded!")

    return emotion_classifier


# =====================================================
# PRELOAD MODEL IN BACKGROUND AT STARTUP
# =====================================================
# Flask starts instantly; the model loads in a background thread so
# the first voice request does not wait for it.

def preload_emotion_model():

    def _load():

        try:
            get_emotion_classifier()
        except Exception as e:
            print("Voice model preload skipped:", str(e))

    threading.Thread(target=_load, daemon=True).start()


# =====================================================
# PREDICT EMOTION
# =====================================================

def predict_emotion(file_path):

    try:

        print("\n================================")
        print("VOICE EMOTION PREDICTION")
        print("================================")

        print("Audio file:")
        print(file_path)

        # -------------------------------------------------
        # CHECK FILE EXISTS
        # -------------------------------------------------

        if not os.path.exists(file_path):

            raise Exception(
                "Audio file does not exist"
            )

        # -------------------------------------------------
        # LOAD AUDIO
        # -------------------------------------------------

        audio, sample_rate = librosa.load(
            file_path,
            sr=16000,
            mono=True
        )

        print(
            "Audio loaded successfully"
        )

        print(
            "Sample rate:",
            sample_rate
        )

        print(
            "Audio samples:",
            len(audio)
        )

        # -------------------------------------------------
        # CHECK AUDIO
        # -------------------------------------------------

        if len(audio) == 0:

            raise Exception(
                "Audio is empty"
            )

        # -------------------------------------------------
        # CLEAN AUDIO (trim silence + even out volume)
        # -------------------------------------------------
        trimmed, _ = librosa.effects.trim(
            audio,
            top_db=30
        )

        # Keep at least 0.5 s after trimming
        if len(trimmed) >= 8000:
            audio = trimmed

        peak = float(np.max(np.abs(audio)))

        if peak > 0:
            audio = audio / peak * 0.95

        duration = len(audio) / 16000

        print("Audio length after cleaning (s):", round(duration, 2))

        if duration < 1.0:
            raise Exception(
                "Recording is too short. Please speak for at least 2 seconds."
            )

        # -------------------------------------------------
        # LOAD MODEL
        # -------------------------------------------------

        print(
            "Getting HuBERT emotion model..."
        )

        classifier = get_emotion_classifier()

        # -------------------------------------------------
        # RUN MODEL
        # -------------------------------------------------

        print(
            "Running HuBERT emotion model..."
        )

        results = classifier(
            {
                "raw": audio,
                "sampling_rate": 16000
            }
        )

        print(
            "Model result:",
            results
        )

        if not results:

            raise Exception(
                "No emotion detected"
            )

        # -------------------------------------------------
        # BEST RESULT
        # -------------------------------------------------

        best = max(
            results,
            key=lambda x: x["score"]
        )

        label = best["label"]

        confidence = float(
            best["score"]
        )

        # -------------------------------------------------
        # EMOTION MAP
        # -------------------------------------------------

        emotion_map = {

            "hap": "Happy",
            "neu": "Neutral",
            "sad": "Sad",
            "ang": "Angry",

            "happy": "Happy",
            "neutral": "Neutral",
            "sadness": "Sad",
            "angry": "Angry"
        }

        emotion = emotion_map.get(
            label.lower(),
            label.capitalize()
        )

        print(
            "Detected emotion:",
            emotion
        )

        print(
            "Confidence:",
            confidence
        )

        # -------------------------------------------------
        # RETURN RESULT
        # -------------------------------------------------

        # All emotion scores, so the app can show the full picture
        scores = {}

        for item in results:

            name = emotion_map.get(
                item["label"].lower(),
                item["label"].capitalize()
            )

            scores[name] = round(float(item["score"]), 3)

        print("All scores:", scores)

        return {
            "emotion": emotion,
            "confidence": round(
                confidence,
                3
            ),
            "scores": scores
        }

    except Exception as e:

        print(
            "VOICE MODEL ERROR:",
            str(e)
        )

        raise

