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

  // --------------------------------
  // MOODS
  // --------------------------------

  const moods = [
    { name: "Happy", emoji: "😊", color: "#facc15" },
    { name: "Calm", emoji: "😌", color: "#22c55e" },
    { name: "Neutral", emoji: "😐", color: "#94a3b8" },
    { name: "Sad", emoji: "😔", color: "#3b82f6" },
    { name: "Anxious", emoji: "😟", color: "#f59e0b" },
    { name: "Angry", emoji: "😠", color: "#ef4444" },
    { name: "Fear", emoji: "😨", color: "#a855f7" },
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

  const loadMoods = async (user) => {
    try {
      if (!user) {
        setSavedMoods([]);
        return;
      }

      console.log(
        "MoodTracker - Loading moods for:",
        user.uid
      );

      const response = await fetch(
        `${API_URL}/moods/${user.uid}`
      );

      if (!response.ok) {
        throw new Error("Failed to load moods");
      }

      const data = await response.json();

      if (data.success) {
        setSavedMoods(data.moods || []);

        console.log(
          "MoodTracker - Moods loaded:",
          data.moods || []
        );
      }
    } catch (error) {
      console.error(
        "LOAD MOODS ERROR:",
        error
      );
    }
  };

  // --------------------------------
  // LOAD MOODS AFTER LOGIN
  // --------------------------------

  useEffect(() => {
    const auth = getAuth();

    /*
      Firebase may take a moment to restore
      the login session after page refresh.

      onAuthStateChanged runs only for this
      component and loads the moods once.
    */

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          loadMoods(user);
        }
      );

    return () => unsubscribe();
  }, []);

  // --------------------------------
  // LISTEN FOR MOOD UPDATES
  // --------------------------------

  useEffect(() => {
    const handleMoodUpdated = () => {
      const user = getCurrentUser();

      if (user) {
        loadMoods(user);
      }
    };

    window.addEventListener(
      "moodUpdated",
      handleMoodUpdated
    );

    return () => {
      window.removeEventListener(
        "moodUpdated",
        handleMoodUpdated
      );
    };
  }, []);

  // --------------------------------
  // SAVE MOOD
  // --------------------------------

  const saveMood = async () => {
    if (!selectedMood) {
      setMessage(
        "Please select your mood first."
      );
      return;
    }

    const user = getCurrentUser();

    if (!user) {
      setMessage(
        "Please login first."
      );
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

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to save mood"
        );
      }

      // --------------------------------
      // SHOW MOOD IMMEDIATELY
      // --------------------------------

      const newMood = {
        id:
          data.mood?.id ||
          Date.now(),

        mood: moodToSave,

        note: noteToSave,

        source: "mood",

        confidence: null,

        created_at:
          data.mood?.created_at ||
          new Date().toISOString(),
      };

      setSavedMoods(
        (previous) => [
          newMood,
          ...previous,
        ]
      );

      // --------------------------------
      // NOTIFY OTHER PAGES
      // --------------------------------

      window.dispatchEvent(
        new CustomEvent(
          "moodUpdated",
          {
            detail: {
              firebase_uid:
                user.uid,

              mood: moodToSave,

              note: noteToSave,
            },
          }
        )
      );

      // --------------------------------
      // CLEAR FORM
      // --------------------------------

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
  // GET MOOD DETAILS
  // --------------------------------

  const getMoodDetails = (mood) => {
    const foundMood =
      moods.find(
        (item) =>
          item.name.toLowerCase() ===
          String(mood).toLowerCase()
      );

    return (
      foundMood || {
        name: mood,
        emoji: "💙",
        color: "#3b82f6",
      }
    );
  };

  // --------------------------------
  // GET MOOD EMOJI
  // --------------------------------

  const getMoodEmoji = (mood) => {
    return getMoodDetails(
      mood
    ).emoji;
  };

  // --------------------------------
  // UI
  // --------------------------------

  return (
    <div className="mood-page">

      {/* HEADER */}

      <div className="mood-header">

        <h2>
          How are you feeling today? 💙
        </h2>

        <p>
          Take a moment to check in
          with yourself.
        </p>

      </div>

      {/* MOOD CARD */}

      <div className="mood-card">

        <h3>
          Select your mood
        </h3>

        {/* MOOD OPTIONS */}

        <div className="mood-options">

          {moods.map((item) => (

            <button
              key={item.name}
              type="button"

              className={
                selectedMood ===
                item.name
                  ? "mood-option selected"
                  : "mood-option"
              }

              style={{
                "--mood-color":
                  item.color,
              }}

              onClick={() =>
                setSelectedMood(
                  item.name
                )
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

        {/* NOTE */}

        <div className="mood-note">

          <label>
            Add a note
          </label>

          <textarea
            value={note}

            onChange={(e) =>
              setNote(
                e.target.value
              )
            }

            placeholder="How was your day?"

            rows="4"
          />

        </div>

        {/* SAVE BUTTON */}

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

        {/* MESSAGE */}

        {message && (

          <p className="mood-message">
            {message}
          </p>

        )}

        {/* PREVIOUS MOODS */}

        {savedMoods.length > 0 && (

          <div className="previous-moods">

            <h3>
              Your Previous Moods
            </h3>

            {savedMoods.map(
              (item) => {

                const moodDetails =
                  getMoodDetails(
                    item.mood
                  );

                return (

                  <div
                    className="previous-mood-item"

                    key={item.id}

                    style={{
                      "--mood-color":
                        moodDetails.color,
                    }}
                  >

                    <div>

                      <strong>

                        {moodDetails.emoji}{" "}

                        {item.mood}

                      </strong>

                      {item.note && (

                        <p>
                          {item.note}
                        </p>

                      )}

                    </div>

                    <small>

                      {item.created_at
                        ? new Date(
                            item.created_at
                          ).toLocaleString(
                            "en-IN"
                          )
                        : ""}

                    </small>

                  </div>

                );
              }
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default MoodTracker;