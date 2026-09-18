
import React, { useEffect, useState } from "react";
import "./App.css";

import {
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";

const API_URL = "http://127.0.0.1:5000";

function AIWellness() {
  const [latestMood, setLatestMood] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================================
  // LOAD LATEST MOOD FROM POSTGRESQL
  // =========================================

  const loadLatestMood = async (user) => {
    try {
      if (!user) {
        console.log(
          "AI Wellness: No Firebase user logged in."
        );

        setLatestMood(null);
        setLoading(false);
        return;
      }

      console.log(
        "AI Wellness - Firebase UID:",
        user.uid
      );

      setLoading(true);

      const response = await fetch(
        `${API_URL}/moods/${user.uid}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load mood data"
        );
      }

      const savedMoods =
        data.moods || [];

      console.log(
        "AI Wellness - PostgreSQL moods:",
        savedMoods
      );

      if (savedMoods.length === 0) {
        setLatestMood(null);
        return;
      }

      // Backend returns newest mood first
      const latest =
        savedMoods[0];

      console.log(
        "AI Wellness - Latest mood:",
        latest
      );

      setLatestMood(latest);

    } catch (error) {
      console.error(
        "AI Wellness - Error loading mood:",
        error
      );

      setLatestMood(null);

    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // FIREBASE AUTH LISTENER
  // =========================================

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          loadLatestMood(user);
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  // =========================================
  // RECOMMENDATIONS
  // =========================================

  const recommendations = {

    Happy: {
      emoji: "😊",
      title: "You're feeling happy!",
      message:
        "Keep your positive energy going with uplifting music and an active exercise.",

      music:
        "Happy & Feel Good Music",

      spotify:
        "https://open.spotify.com/search/happy%20feel%20good%20music",

      exercises: [
        "20-minute walk",
        "Light dancing",
        "Outdoor activity",
      ],
    },

    Calm: {
      emoji: "😌",
      title: "You're feeling calm",
      message:
        "Maintain your peaceful state with relaxing music and gentle activities.",

      music:
        "Calm & Relaxing Music",

      spotify:
        "https://open.spotify.com/search/calm%20relaxing%20music",

      exercises: [
        "5-minute deep breathing",
        "Gentle stretching",
        "10-minute meditation",
      ],
    },

    Neutral: {
      emoji: "😐",
      title: "Your mood is neutral",
      message:
        "A little movement and positive music can help maintain your wellbeing.",

      music:
        "Positive & Chill Music",

      spotify:
        "https://open.spotify.com/search/positive%20chill%20music",

      exercises: [
        "10-minute walk",
        "Light stretching",
        "5-minute breathing exercise",
      ],
    },

    Sad: {
      emoji: "😔",
      title: "You seem to be feeling sad",
      message:
        "Be gentle with yourself. Try calming music and a simple physical activity.",

      music:
        "Calm & Healing Music",

      spotify:
        "https://open.spotify.com/search/calm%20healing%20music",

      exercises: [
        "5-minute deep breathing",
        "10-minute slow walk",
        "Gentle stretching",
      ],
    },

    Angry: {
      emoji: "😠",
      title: "You seem to be feeling angry",
      message:
        "Take a short break and try activities that can help release tension safely.",

      music:
        "Stress Relief Music",

      spotify:
        "https://open.spotify.com/search/stress%20relief%20music",

      exercises: [
        "Deep breathing",
        "15-minute walk",
        "Full-body stretching",
      ],
    },

    Fear: {
      emoji: "😨",
      title: "You seem to be feeling anxious",
      message:
        "Slow down and focus on your breathing. Gentle movement may help.",

      music:
        "Anxiety Relief & Calm Music",

      spotify:
        "https://open.spotify.com/search/anxiety%20relief%20calm%20music",

      exercises: [
        "4-4 breathing exercise",
        "10-minute gentle walk",
        "Mindful stretching",
      ],
    },

    Disgust: {
      emoji: "🤢",
      title: "Let's help you reset",
      message:
        "Take a short break and choose something comfortable and relaxing.",

      music:
        "Relaxing Chill Music",

      spotify:
        "https://open.spotify.com/search/relaxing%20chill%20music",

      exercises: [
        "Deep breathing",
        "Gentle stretching",
        "Short walk",
      ],
    },

    Surprise: {
      emoji: "😮",
      title:
        "You're experiencing something unexpected",
      message:
        "Take a moment to understand how you're feeling.",

      music:
        "Chill & Positive Music",

      spotify:
        "https://open.spotify.com/search/chill%20positive%20music",

      exercises: [
        "Deep breathing",
        "Light stretching",
        "Short walk",
      ],
    },

    Anxious: {
      emoji: "😟",
      title: "You may be feeling anxious",
      message:
        "Try slowing down and focusing on your breathing.",

      music:
        "Anxiety Relief Music",

      spotify:
        "https://open.spotify.com/search/anxiety%20relief%20music",

      exercises: [
        "4-4 breathing",
        "10-minute walk",
        "Gentle stretching",
      ],
    },
  };

  // =========================================
  // GET RECOMMENDATION
  // =========================================

  let recommendation = null;

  if (latestMood) {
    const emotion =
      latestMood.emotion ||
      latestMood.mood ||
      "";

    recommendation =
      recommendations[emotion];

    console.log(
      "Detected emotion:",
      emotion
    );

    console.log(
      "Recommendation:",
      recommendation
    );
  }

  // =========================================
  // LOADING UI
  // =========================================

  if (loading) {
    return (
      <div className="wellness-page">

        <div className="wellness-header">

          <div className="wellness-main-icon">
            🤖
          </div>

          <div>

            <h2>
              AI Wellness Recommendations
            </h2>

            <p>
              Personalized music and exercise
              suggestions based on your latest mood.
            </p>

          </div>

        </div>

        <div className="wellness-empty">

          <div className="wellness-empty-icon">
            ⏳
          </div>

          <h3>
            Loading your wellness data...
          </h3>

          <p>
            Please wait while we retrieve
            your latest mood.
          </p>

        </div>

      </div>
    );
  }

  // =========================================
  // UI
  // =========================================

  return (
    <div className="wellness-page">

      {/* HEADER */}

      <div className="wellness-header">

        <div className="wellness-main-icon">
          🤖
        </div>

        <div>

          <h2>
            AI Wellness Recommendations
          </h2>

          <p>
            Personalized music and exercise
            suggestions based on your latest mood.
          </p>

        </div>

      </div>

      {/* =====================================
          NO MOOD
      ===================================== */}

      {!latestMood && (

        <div className="wellness-empty">

          <div className="wellness-empty-icon">
            💭
          </div>

          <h3>
            No mood detected yet
          </h3>

          <p>
            First use Voice Emotion Detection
            or Mood Tracker to record your mood.
          </p>

        </div>

      )}

      {/* =====================================
          MOOD FOUND BUT UNKNOWN
      ===================================== */}

      {latestMood && !recommendation && (

        <div className="wellness-empty">

          <div className="wellness-empty-icon">
            🧠
          </div>

          <h3>
            Mood detected
          </h3>

          <p>
            Latest mood:
            <strong>
              {" "}
              {latestMood.emotion ||
                latestMood.mood ||
                "Unknown"}
            </strong>
          </p>

          <p>
            We don't have a recommendation
            for this emotion yet.
          </p>

        </div>

      )}

      {/* =====================================
          RECOMMENDATIONS
      ===================================== */}

      {latestMood && recommendation && (

        <>

          {/* CURRENT MOOD */}

          <div className="current-mood-card">

            <div className="current-mood-emoji">

              {recommendation.emoji}

            </div>

            <div>

              <p className="small-title">
                Your Latest Mood
              </p>

              <h2>
                {latestMood.emotion ||
                  latestMood.mood}
              </h2>

              <p>

                Detected from{" "}

                <strong>
                  {latestMood.source === "voice"
                    ? "Voice Emotion"
                    : "Mood Tracker"}
                </strong>

              </p>

              {latestMood.created_at && (
                <small>
                  {new Date(
                    latestMood.created_at
                  ).toLocaleString()}
                </small>
              )}

            </div>

          </div>

          {/* AI INSIGHT */}

          <div className="wellness-insight">

            <div>
              💡
            </div>

            <div>

              <h3>
                {recommendation.title}
              </h3>

              <p>
                {recommendation.message}
              </p>

            </div>

          </div>

          {/* MUSIC */}

          <div className="wellness-card">

            <div className="wellness-card-icon">
              🎵
            </div>

            <div className="wellness-card-content">

              <h3>
                Music Recommendation
              </h3>

              <p>
                {recommendation.music}
              </p>

              <a
                href={recommendation.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="spotify-button"
              >
                🎧 Open in Spotify
              </a>

            </div>

          </div>

          {/* EXERCISE */}

          <div className="wellness-card">

            <div className="wellness-card-icon">
              🧘
            </div>

            <div className="wellness-card-content">

              <h3>
                Exercise Recommendation
              </h3>

              <p>
                Recommended activities:
              </p>

              <div className="exercise-list">

                {recommendation.exercises.map(
                  (exercise, index) => (

                    <div
                      className="exercise-item"
                      key={index}
                    >

                      <span>
                        ✓
                      </span>

                      {exercise}

                    </div>

                  )
                )}

              </div>

            </div>

          </div>

          {/* DISCLAIMER */}

          <div className="wellness-disclaimer">

            💙 These are general wellness
            suggestions and not medical advice.

          </div>

        </>

      )}

    </div>
  );
}

export default AIWellness;

