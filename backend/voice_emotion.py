import os
import numpy as np
import librosa

from transformers import pipeline


# =====================================================
# MODEL SETTINGS
# =====================================================

MODEL_NAME = "superb/hubert-large-superb-er"

# Model is NOT loaded when Flask starts
emotion_classifier = None


# =====================================================
# LOAD MODEL ONLY WHEN NEEDED
# =====================================================

def get_emotion_classifier():

    global emotion_classifier

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

        return {

            "emotion": emotion,

            "confidence": round(
                confidence,
                3
            )
        }

    except Exception as e:

        print(
            "VOICE MODEL ERROR:",
            str(e)
        )

        raise