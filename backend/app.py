import os
import uuid

from flask import Flask, request, jsonify
from flask_cors import CORS

from model import generate_response
from safety import check_crisis, crisis_response
from voice_emotion import predict_emotion

# PostgreSQL
from database import get_db_connection


# =====================================================
# FLASK APP
# =====================================================

app = Flask(__name__)

CORS(app)


# =====================================================
# HOME
# =====================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status": "success",
        "message": "MindCare AI backend is running"
    })


# =====================================================
# HEALTH CHECK
# =====================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "healthy",
        "text_ai": "Hugging Face API",
        "voice_emotion": "Enabled",
        "voice_model": "superb/hubert-large-superb-er",
        "database": "PostgreSQL"
    })


# =====================================================
# TEST POSTGRESQL DATABASE
# =====================================================

@app.route("/test-db", methods=["GET"])
def test_db():

    connection = None
    cursor = None

    try:

        print("\n================================")
        print("Testing PostgreSQL connection...")
        print("================================")

        connection = get_db_connection()

        cursor = connection.cursor()

        cursor.execute("SELECT NOW()")

        result = cursor.fetchone()

        print("PostgreSQL connection successful!")

        return jsonify({
            "success": True,
            "message": "PostgreSQL connected successfully",
            "database_time": str(result[0])
        })

    except Exception as e:

        print("DATABASE ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# SAVE / UPDATE USER
# =====================================================

@app.route("/users", methods=["POST"])
def save_user():

    connection = None
    cursor = None

    try:

        data = request.get_json() or {}

        firebase_uid = data.get("firebase_uid")
        name = data.get("name", "User")
        email = data.get("email")
        photo_url = data.get("photo_url", "")

        # -------------------------------------------------
        # CHECK REQUIRED INFORMATION
        # -------------------------------------------------

        if not firebase_uid:

            return jsonify({
                "success": False,
                "error": "Firebase UID is required"
            }), 400

        if not email:

            return jsonify({
                "success": False,
                "error": "Email is required"
            }), 400

        # -------------------------------------------------
        # CONNECT DATABASE
        # -------------------------------------------------

        connection = get_db_connection()

        cursor = connection.cursor()

        # -------------------------------------------------
        # INSERT OR UPDATE USER
        # -------------------------------------------------

        cursor.execute("""
            INSERT INTO users
            (
                firebase_uid,
                name,
                email,
                photo_url
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )
            ON CONFLICT (firebase_uid)
            DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                photo_url = EXCLUDED.photo_url
        """, (
            firebase_uid,
            name,
            email,
            photo_url
        ))

        connection.commit()

        print("\n================================")
        print("USER SAVED SUCCESSFULLY")
        print("================================")
        print("Name:", name)
        print("Email:", email)
        print("Firebase UID:", firebase_uid)
        print("================================\n")

        return jsonify({
            "success": True,
            "message": "User saved successfully"
        })

    except Exception as e:

        if connection:
            connection.rollback()

        print("USER SAVE ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# GET USER PROFILE
# =====================================================

@app.route("/users/<firebase_uid>", methods=["GET"])
def get_user(firebase_uid):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor()

        cursor.execute("""
            SELECT
                firebase_uid,
                name,
                email,
                photo_url,
                created_at
            FROM users
            WHERE firebase_uid = %s
        """, (firebase_uid,))

        row = cursor.fetchone()

        if not row:

            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404

        return jsonify({
            "success": True,
            "user": {
                "firebase_uid": row[0],
                "name": row[1],
                "email": row[2],
                "photo_url": row[3],
                "created_at": str(row[4])
            }
        })

    except Exception as e:

        print("USER GET ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# SAVE MOOD
# =====================================================

@app.route("/moods", methods=["POST"])
def save_mood():

    connection = None
    cursor = None

    try:

        data = request.get_json() or {}

        firebase_uid = data.get("firebase_uid")
        mood = data.get("mood")
        note = data.get("note", "")
        source = data.get("source", "mood")
        confidence = data.get("confidence")

        # -------------------------------------------------
        # CHECK FIREBASE UID
        # -------------------------------------------------

        if not firebase_uid:

            return jsonify({
                "success": False,
                "error": "Firebase UID is required"
            }), 400

        # -------------------------------------------------
        # CHECK MOOD
        # -------------------------------------------------

        if not mood:

            return jsonify({
                "success": False,
                "error": "Mood is required"
            }), 400

        # -------------------------------------------------
        # CONNECT DATABASE
        # -------------------------------------------------

        connection = get_db_connection()

        cursor = connection.cursor()

        # -------------------------------------------------
        # SAVE MOOD
        # -------------------------------------------------

        cursor.execute("""
            INSERT INTO mood_entries
            (
                firebase_uid,
                mood,
                note,
                source,
                confidence
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s
            )
        """, (
            firebase_uid,
            mood,
            note,
            source,
            confidence
        ))

        connection.commit()

        print("\n================================")
        print("MOOD SAVED SUCCESSFULLY")
        print("================================")
        print("User:", firebase_uid)
        print("Mood:", mood)
        print("Source:", source)
        print("Confidence:", confidence)
        print("Note:", note)
        print("================================\n")

        return jsonify({
            "success": True,
            "message": "Mood saved successfully"
        })

    except Exception as e:

        if connection:
            connection.rollback()

        print("SAVE MOOD ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# GET USER MOODS
# =====================================================

@app.route("/moods/<firebase_uid>", methods=["GET"])
def get_moods(firebase_uid):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor()

        cursor.execute("""
            SELECT
                id,
                mood,
                note,
                source,
                confidence,
                created_at
            FROM mood_entries
            WHERE firebase_uid = %s
            ORDER BY created_at DESC
        """, (firebase_uid,))

        rows = cursor.fetchall()

        moods = []

        for row in rows:

            moods.append({
                "id": row[0],
                "mood": row[1],
                "note": row[2],
                "source": row[3],
                "confidence": row[4],
                "created_at": str(row[5])
            })

        return jsonify({
            "success": True,
            "moods": moods
        })

    except Exception as e:

        print("MOOD GET ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# DELETE USER MOODS
# =====================================================

@app.route("/moods/<firebase_uid>", methods=["DELETE"])
def delete_moods(firebase_uid):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor()

        cursor.execute("""
            DELETE FROM mood_entries
            WHERE firebase_uid = %s
        """, (firebase_uid,))

        deleted_count = cursor.rowcount

        connection.commit()

        print("\n================================")
        print("MOODS DELETED")
        print("================================")
        print("User:", firebase_uid)
        print("Records deleted:", deleted_count)
        print("================================\n")

        return jsonify({
            "success": True,
            "message": "Mood records deleted successfully",
            "deleted_count": deleted_count
        })

    except Exception as e:

        if connection:
            connection.rollback()

        print("MOOD DELETE ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# CHAT AI
# =====================================================

@app.route("/chat", methods=["POST"])
def chat():

    try:

        data = request.get_json() or {}

        user_message = data.get(
            "message",
            ""
        ).strip()

        chat_history = data.get(
            "history",
            []
        )

        # -------------------------------------------------
        # EMPTY MESSAGE CHECK
        # -------------------------------------------------

        if not user_message:

            return jsonify({
                "success": False,
                "error": "Message cannot be empty"
            }), 400

        # -------------------------------------------------
        # CRISIS / SAFETY CHECK
        # -------------------------------------------------

        if check_crisis(user_message):

            return jsonify({
                "success": True,
                "reply": crisis_response(),
                "type": "safety"
            })

        # -------------------------------------------------
        # GENERATE AI RESPONSE
        # -------------------------------------------------

        response = generate_response(
            user_message,
            chat_history
        )

        # -------------------------------------------------
        # RETURN AI RESPONSE
        # -------------------------------------------------

        return jsonify({
            "success": True,
            "reply": response,
            "type": "ai"
        })

    except Exception as e:

        print(
            "CHAT ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "error": "Something went wrong",
            "details": str(e)
        }), 500


# =====================================================
# GET CHAT HISTORY
# =====================================================

@app.route("/chat/history/<firebase_uid>", methods=["GET"])
def get_chat_history(firebase_uid):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor()

        cursor.execute("""
            SELECT
                id,
                role,
                content,
                message_type,
                created_at
            FROM chat_messages
            WHERE firebase_uid = %s
            ORDER BY created_at ASC
        """, (firebase_uid,))

        rows = cursor.fetchall()

        messages = []

        for row in rows:

            messages.append({
                "id": row[0],
                "role": row[1],
                "content": row[2],
                "message_type": row[3],
                "created_at": str(row[4])
            })

        return jsonify({
            "success": True,
            "messages": messages
        })

    except Exception as e:

        print(
            "CHAT HISTORY GET ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# SAVE CHAT MESSAGE
# =====================================================

@app.route("/chat/history", methods=["POST"])
def save_chat_message():

    connection = None
    cursor = None

    try:

        data = request.get_json() or {}

        firebase_uid = data.get("firebase_uid")
        role = data.get("role")
        content = data.get("content")
        message_type = data.get(
            "message_type",
            "ai"
        )

        # -------------------------------------------------
        # CHECK REQUIRED DATA
        # -------------------------------------------------

        if not firebase_uid:

            return jsonify({
                "success": False,
                "error": "Firebase UID is required"
            }), 400

        if not role:

            return jsonify({
                "success": False,
                "error": "Role is required"
            }), 400

        if not content:

            return jsonify({
                "success": False,
                "error": "Content is required"
            }), 400

        # -------------------------------------------------
        # CONNECT DATABASE
        # -------------------------------------------------

        connection = get_db_connection()

        cursor = connection.cursor()

        # -------------------------------------------------
        # SAVE MESSAGE
        # -------------------------------------------------

        cursor.execute("""
            INSERT INTO chat_messages
            (
                firebase_uid,
                role,
                content,
                message_type
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )
        """, (
            firebase_uid,
            role,
            content,
            message_type
        ))

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Chat message saved successfully"
        })

    except Exception as e:

        if connection:
            connection.rollback()

        print(
            "CHAT MESSAGE SAVE ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# DELETE CHAT HISTORY
# =====================================================

@app.route("/chat/history/<firebase_uid>", methods=["DELETE"])
def delete_chat_history(firebase_uid):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor()

        cursor.execute("""
            DELETE FROM chat_messages
            WHERE firebase_uid = %s
        """, (firebase_uid,))

        deleted_count = cursor.rowcount

        connection.commit()

        print("\n================================")
        print("CHAT HISTORY DELETED")
        print("================================")
        print("User:", firebase_uid)
        print("Messages deleted:", deleted_count)
        print("================================\n")

        return jsonify({
            "success": True,
            "message": "Chat history deleted successfully",
            "deleted_count": deleted_count
        })

    except Exception as e:

        if connection:
            connection.rollback()

        print(
            "CHAT HISTORY DELETE ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# VOICE EMOTION DETECTION
# =====================================================

@app.route("/predict-voice", methods=["POST"])
def predict_voice():

    file_path = None

    try:

        print("\n================================")
        print("     VOICE EMOTION REQUEST")
        print("================================")

        # -------------------------------------------------
        # CHECK AUDIO FILE
        # -------------------------------------------------

        if "audio" not in request.files:

            print(
                "ERROR: No audio file received"
            )

            return jsonify({
                "success": False,
                "error": "No audio file received"
            }), 400

        audio = request.files["audio"]

        # -------------------------------------------------
        # CHECK FILE NAME
        # -------------------------------------------------

        if audio.filename == "":

            return jsonify({
                "success": False,
                "error": "No audio file selected"
            }), 400

        print(
            "Audio received:",
            audio.filename
        )

        # -------------------------------------------------
        # CREATE TEMPORARY AUDIO FILE
        # -------------------------------------------------

        filename = (
            f"voice_{uuid.uuid4().hex}.webm"
        )

        file_path = os.path.join(
            app.root_path,
            filename
        )

        audio.save(file_path)

        print(
            "Audio saved:",
            file_path
        )

        print(
            "Audio format: .webm"
        )

        # -------------------------------------------------
        # RUN VOICE EMOTION MODEL
        # -------------------------------------------------

        print(
            "Running voice emotion model..."
        )

        result = predict_emotion(
            file_path
        )

        print(
            "Voice model result:",
            result
        )

        # -------------------------------------------------
        # CHECK RESULT
        # -------------------------------------------------

        if not result:

            return jsonify({
                "success": False,
                "error": "No emotion result returned"
            }), 500

        # -------------------------------------------------
        # GET EMOTION
        # -------------------------------------------------

        emotion = result.get(
            "emotion",
            "Unknown"
        )

        # -------------------------------------------------
        # GET CONFIDENCE
        # -------------------------------------------------

        confidence = result.get(
            "confidence",
            0
        )

        # -------------------------------------------------
        # RETURN RESULT
        # -------------------------------------------------

        return jsonify({
            "success": True,
            "emotion": emotion,
            "confidence": confidence
        })

    except Exception as e:

        print(
            "VOICE ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        # -------------------------------------------------
        # DELETE TEMPORARY AUDIO FILE
        # -------------------------------------------------

        if (
            file_path
            and os.path.exists(file_path)
        ):

            try:

                os.remove(file_path)

                print(
                    "Temporary audio deleted"
                )

            except Exception as e:

                print(
                    "Could not delete temporary audio:",
                    e
                )


# =====================================================
# START SERVER
# =====================================================

if __name__ == "__main__":

    print("\n================================")
    print("          MindCare AI")
    print("================================")
    print("Backend: Flask")
    print("Text AI: Hugging Face API")
    print("Voice Emotion: Enabled")
    print("Voice Model: HuBERT-SUPERB-ER")
    print("Database: PostgreSQL")
    print("Audio Format: WebM")
    print("User Database: Enabled")
    print("Mood Database: Enabled")
    print("Chat Database: Enabled")
    print("Port: 5000")
    print("================================\n")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False
    )