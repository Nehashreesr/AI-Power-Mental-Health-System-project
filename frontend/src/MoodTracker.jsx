
import React, { useEffect, useState } from "react";
import "./App.css";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const API_URL = "http://127.0.0.1:5000";

function MoodTracker() {
  const [selectedMood, setSelectedMood] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [savedMoods, setSavedMoods] = useState([]);
  const [loading, setLoading] = useState(false);

  const moods = [
    { name: "Happy", emoji: "😊" },
    { name: "Calm", emoji: "😌" },
    { name: "Neutral", emoji: "😐" },
    { name: "Sad", emoji: "😔" },
    { name: "Anxious", emoji: "😟" },
  ];

  // --------------------------------
  // GET CURRENT FIREBASE USER
  // --------------------------------
  const getCurrentUser = () => {
    const auth = getAuth();
    return auth.currentUser;
  };

  // --------------------------------
  // LOAD MOODS FROM POSTGRESQL
  // --------------------------------
  const loadMoods = async () => {
    try {
      const user = getCurrentUser();

      if (!user) {
        setSavedMoods([]);
        return;
      }

      const response = await fetch(
        `${API_URL}/moods/${user.uid}`
      );

      if (!response.ok) {
        throw new Error("Failed to load moods");
      }

      const data = await response.json();

      if (data.success) {
        setSavedMoods(data.moods || []);
      }
    } catch (error) {
      console.error("LOAD MOODS ERROR:", error);
    }
  };

  // --------------------------------
  // LOAD MOODS AFTER LOGIN
  // --------------------------------
  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          loadMoods();
        } else {
          setSavedMoods([]);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // --------------------------------
  // SAVE MOOD
  // --------------------------------
  const saveMood = async () => {
    if (!selectedMood) {
      setMessage("Please select your mood first.");
      return;
    }

    const user = getCurrentUser();

    if (!user) {
      setMessage("Please login first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const moodToSave = selectedMood;
      const noteToSave = note;

      // --------------------------------
      // SAVE TO POSTGRESQL
      // --------------------------------
      const response = await fetch(
        `${API_URL}/moods`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firebase_uid: user.uid,
            mood: moodToSave,
            note: noteToSave,
            source: "mood",
            confidence: null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to save mood"
        );
      }

      // --------------------------------
      // SHOW MOOD IMMEDIATELY
      // --------------------------------
      const newMood = {
        id: Date.now(),
        mood: moodToSave,
        note: noteToSave,
        source: "mood",
        confidence: null,
        created_at: new Date().toISOString(),
      };

      setSavedMoods((previous) => [
        newMood,
        ...previous,
      ]);

      // --------------------------------
      // NOTIFY OTHER PAGES
      // --------------------------------
      window.dispatchEvent(
        new CustomEvent("moodUpdated", {
          detail: {
            firebase_uid: user.uid,
            mood: moodToSave,
            note: noteToSave,
          },
        })
      );

      // Clear form
      setSelectedMood("");
      setNote("");

      setMessage(
        "Your mood has been saved 💙"
      );

    } catch (error) {
      console.error(
        "SAVE MOOD ERROR:",
        error
      );

      setMessage(
        "Could not save your mood. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // GET MOOD EMOJI
  // --------------------------------
  const getMoodEmoji = (mood) => {
    const foundMood = moods.find(
      (item) =>
        item.name.toLowerCase() ===
        String(mood).toLowerCase()
    );

    return foundMood
      ? foundMood.emoji
      : "💙";
  };

  return (
    <div className="mood-page">

      <div className="mood-header">
        <h2>
          How are you feeling today? 💙
        </h2>

        <p>
          Take a moment to check in
          with yourself.
        </p>
      </div>

      <div className="mood-card">

        <h3>Select your mood</h3>

        <div className="mood-options">

          {moods.map((item) => (
            <button
              key={item.name}
              type="button"
              className={
                selectedMood === item.name
                  ? "mood-option selected"
                  : "mood-option"
              }
              onClick={() =>
                setSelectedMood(item.name)
              }
            >
              <span className="mood-emoji">
                {item.emoji}
              </span>

              <span>
                {item.name}
              </span>
            </button>
          ))}

        </div>

        <div className="mood-note">

          <label>Add a note</label>

          <textarea
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            placeholder="How was your day?"
            rows="4"
          />

        </div>

        <button
          type="button"
          className="save-mood-button"
          onClick={saveMood}
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : "Save Mood 💙"}
        </button>

        {message && (
          <p className="mood-message">
            {message}
          </p>
        )}

        {/* PREVIOUS MOODS */}
        {savedMoods.length > 0 && (
          <div className="previous-moods">

            <h3>Your Previous Moods</h3>

            {savedMoods.map((item) => (
              <div
                className="previous-mood-item"
                key={item.id}
              >

                <div>
                  <strong>
                    {getMoodEmoji(item.mood)}{" "}
                    {item.mood}
                  </strong>

                  {item.note && (
                    <p>{item.note}</p>
                  )}
                </div>

                <small>
                  {item.created_at
                    ? new Date(
                        item.created_at
                      ).toLocaleString()
                    : ""}
                </small>

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
}

export default MoodTracker;
