
import React, { useEffect, useState } from "react";
import "./App.css";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { getAuth, onAuthStateChanged } from "firebase/auth";

const API_URL = "http://127.0.0.1:5000";

function MoodAnalytics() {
  const [moodData, setMoodData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // =========================================
  // MOODS / EMOTIONS
  // =========================================

  const moods = [
    {
      mood: "Happy",
      emoji: "😊",
      color: "#FFD166",
    },
    {
      mood: "Calm",
      emoji: "😌",
      color: "#06D6A0",
    },
    {
      mood: "Neutral",
      emoji: "😐",
      color: "#8E9AAF",
    },
    {
      mood: "Sad",
      emoji: "😔",
      color: "#5B8DEF",
    },
    {
      mood: "Angry",
      emoji: "😠",
      color: "#EF476F",
    },
    {
      mood: "Fear",
      emoji: "😨",
      color: "#9B5DE5",
    },
    {
      mood: "Anxious",
      emoji: "😟",
      color: "#F8961E",
    },
  ];

  // =========================================
  // MOOD SCORES
  // =========================================

  const moodScores = {
    Happy: 5,
    Calm: 4,
    Neutral: 3,
    Anxious: 2,
    Fear: 2,
    Sad: 1,
    Angry: 1,
  };

  // =========================================
  // LOAD USER MOODS FROM POSTGRESQL
  // =========================================

  const loadMoodData = async (user) => {
    try {
      if (!user) {
        console.log("No Firebase user found.");
        setMoodData([]);
        setTrendData([]);
        setLoading(false);
        return;
      }

      console.log(
        "Loading analytics for Firebase UID:",
        user.uid
      );

      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/moods/${user.uid}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load mood data"
        );
      }

      const savedMoods = data.moods || [];

      console.log(
        "Moods received from PostgreSQL:",
        savedMoods
      );

      // =======================================
      // MOOD DISTRIBUTION
      // =======================================

      const calculatedData = moods.map((item) => {
        const count = savedMoods.filter((entry) => {
          const savedEmotion =
            entry.emotion ||
            entry.mood ||
            "";

          return (
            savedEmotion.toLowerCase() ===
            item.mood.toLowerCase()
          );
        }).length;

        return {
          ...item,
          count,
        };
      });

      setMoodData(calculatedData);

      // =======================================
      // MOOD TREND
      // =======================================

      const trend = savedMoods
        .map((entry, index) => {
          const emotion =
            entry.emotion ||
            entry.mood ||
            "Neutral";

          const score =
            moodScores[emotion] || 3;

          return {
            name: `Record ${index + 1}`,
            emotion: emotion,
            score: score,

            // PostgreSQL timestamp
            date:
              entry.created_at ||
              entry.date ||
              "",

            // Mood tracker or voice
            source:
              entry.source ||
              "mood",

            // Note from Mood Tracker
            note:
              entry.note ||
              "",
          };
        })
        .filter(
          (item) => item.emotion
        );

      // Reverse because backend gives newest first.
      // This makes the graph show oldest → newest.
      trend.reverse();

      setTrendData(trend);

    } catch (error) {
      console.error(
        "Error loading mood data:",
        error
      );

      setMoodData([]);
      setTrendData([]);

      setMessage(
        "Could not load your mood data."
      );
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
          loadMoodData(user);
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  // =========================================
  // TOTAL ENTRIES
  // =========================================

  const totalEntries =
    moodData.reduce(
      (total, item) =>
        total + item.count,
      0
    );

  // =========================================
  // MOST COMMON MOOD
  // =========================================

  const mostCommonMood =
    totalEntries > 0
      ? moodData.reduce(
          (prev, current) =>
            current.count > prev.count
              ? current
              : prev
        )
      : null;

  // =========================================
  // VOICE RECORDS
  // =========================================

  const voiceRecords =
    trendData.filter(
      (item) =>
        item.source === "voice"
    ).length;

  // =========================================
  // CLEAR USER'S MOODS
  // =========================================

  const clearMoods = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setMessage("Please login first.");
      return;
    }

    const confirmClear =
      window.confirm(
        "Are you sure you want to clear your mood data?"
      );

    if (!confirmClear) {
      return;
    }

    try {
      setMessage(
        "Clear Data requires a delete endpoint in the backend."
      );

      console.log(
        "User requested mood deletion:",
        user.uid
      );

      /*
        We are intentionally NOT deleting localStorage
        because mood data is now stored in PostgreSQL.

        When we add DELETE /moods/<firebase_uid>
        to Flask, this button can permanently delete
        only this user's database records.
      */

    } catch (error) {
      console.error(
        "CLEAR MOODS ERROR:",
        error
      );

      setMessage(
        "Could not clear mood data."
      );
    }
  };

  // =========================================
  // EMOTION EMOJI
  // =========================================

  const getEmotionEmoji = (
    emotion
  ) => {
    const item = moods.find(
      (mood) =>
        mood.mood.toLowerCase() ===
        emotion.toLowerCase()
    );

    return item
      ? item.emoji
      : "🧠";
  };

  // =========================================
  // EMOTION COLOR
  // =========================================

  const getEmotionColor = (
    emotion
  ) => {
    const item = moods.find(
      (mood) =>
        mood.mood.toLowerCase() ===
        emotion.toLowerCase()
    );

    return item
      ? item.color
      : "#8E9AAF";
  };

  // =========================================
  // FORMAT DATE
  // =========================================

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    try {
      return new Date(
        date
      ).toLocaleString();
    } catch {
      return "";
    }
  };

  // =========================================
  // PIE DATA
  // =========================================

  const compositionData =
    moodData.filter(
      (item) =>
        item.count > 0
    );

  // =========================================
  // LOADING SCREEN
  // =========================================

  if (loading) {
    return (
      <div className="analytics-page">

        <div className="analytics-header">
          <div>
            <h2>
              Mood Analytics 📈
            </h2>

            <p>
              Track and understand your
              emotional patterns.
            </p>
          </div>
        </div>

        <div className="no-data">

          <div>
            📊
          </div>

          <h3>
            Loading your mood data...
          </h3>

          <p>
            Please wait while we retrieve
            your records.
          </p>

        </div>

      </div>
    );
  }

  // =========================================
  // UI
  // =========================================

  return (
    <div className="analytics-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="analytics-header">

        <div>

          <h2>
            Mood Analytics 📈
          </h2>

          <p>
            Track and understand your
            emotional patterns.
          </p>

        </div>

        {totalEntries > 0 && (

          <button
            className="clear-mood-button"
            onClick={clearMoods}
          >
            🗑️ Clear Data
          </button>

        )}

      </div>

      {message && (
        <p className="mood-message">
          {message}
        </p>
      )}

      {/* =====================================
          SUMMARY CARDS
      ===================================== */}

      <div className="analytics-cards">

        <div className="analytics-card">

          <div className="analytics-icon">
            📊
          </div>

          <h3>
            Total Entries
          </h3>

          <strong>
            {totalEntries}
          </strong>

          <p>
            Mood records
          </p>

        </div>

        <div className="analytics-card">

          <div className="analytics-icon">

            {mostCommonMood
              ? mostCommonMood.emoji
              : "💭"}

          </div>

          <h3>
            Most Common Mood
          </h3>

          <strong>

            {mostCommonMood
              ? mostCommonMood.mood
              : "No data"}

          </strong>

          <p>

            {mostCommonMood
              ? `${mostCommonMood.count} entries`
              : "Start tracking"}

          </p>

        </div>

        <div className="analytics-card">

          <div className="analytics-icon">
            🎤
          </div>

          <h3>
            Voice Records
          </h3>

          <strong>
            {voiceRecords}
          </strong>

          <p>
            Voice emotion detections
          </p>

        </div>

      </div>

      {/* =====================================
          MOOD DISTRIBUTION
      ===================================== */}

      <div className="analytics-section">

        <h3>
          🎭 Mood Distribution
        </h3>

        {totalEntries === 0 ? (

          <div className="no-data">

            <div>
              📊
            </div>

            <h3>
              No mood data yet
            </h3>

            <p>
              Go to Mood Tracker or Voice
              Emotion and record your first mood.
            </p>

          </div>

        ) : (

          <div className="colorful-mood-list">

            {moodData.map(
              (item) => {

                const percentage =
                  (item.count /
                    totalEntries) *
                  100;

                return (

                  <div
                    className="colorful-mood-item"
                    key={item.mood}
                  >

                    <div className="colorful-mood-header">

                      <div className="colorful-mood-name">

                        <span className="mood-emoji">
                          {item.emoji}
                        </span>

                        <strong>
                          {item.mood}
                        </strong>

                      </div>

                      <div className="colorful-mood-count">

                        {item.count}

                        <span>
                          {" "}
                          (
                          {Math.round(
                            percentage
                          )}
                          %)
                        </span>

                      </div>

                    </div>

                    <div className="colorful-bar">

                      <div
                        className="colorful-bar-fill"
                        style={{
                          width:
                            `${percentage}%`,
                          backgroundColor:
                            item.color,
                        }}
                      />

                    </div>

                  </div>

                );
              }
            )}

          </div>

        )}

      </div>

      {/* =====================================
          MOOD COMPOSITION
      ===================================== */}

      <div className="analytics-section">

        <h3>
          🎭 Mood Composition
        </h3>

        {totalEntries === 0 ? (

          <div className="no-data">

            <div>
              🥧
            </div>

            <h3>
              No composition data yet
            </h3>

            <p>
              Record some moods to see
              the composition.
            </p>

          </div>

        ) : (

          <div className="composition-container">

            <div className="composition-chart">

              <ResponsiveContainer
                width="100%"
                height={350}
              >

                <PieChart>

                  <Pie
                    data={compositionData}
                    dataKey="count"
                    nameKey="mood"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={70}
                    paddingAngle={4}
                  >

                    {compositionData.map(
                      (item, index) => (

                        <Cell
                          key={
                            `cell-${index}`
                          }
                          fill={
                            item.color
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            </div>

            <div className="composition-legend">

              {compositionData.map(
                (item) => {

                  const percentage =
                    (item.count /
                      totalEntries) *
                    100;

                  return (

                    <div
                      className="composition-item"
                      key={item.mood}
                    >

                      <div>

                        <span
                          className="composition-dot"
                          style={{
                            backgroundColor:
                              item.color,
                          }}
                        />

                        <span>
                          {item.emoji}{" "}
                          {item.mood}
                        </span>

                      </div>

                      <strong>
                        {Math.round(
                          percentage
                        )}
                        %
                      </strong>

                    </div>

                  );

                }
              )}

            </div>

          </div>

        )}

      </div>

      {/* =====================================
          MOOD TREND
      ===================================== */}

      <div className="analytics-section">

        <h3>
          📊 Mood Trend
        </h3>

        <p className="trend-description">
          See how your mood changes across
          your recorded entries.
        </p>

        {trendData.length === 0 ? (

          <div className="no-data">

            <div>
              📈
            </div>

            <h3>
              No trend data yet
            </h3>

            <p>
              Record a few moods to see
              your mood trend.
            </p>

          </div>

        ) : (

          <div
            style={{
              width: "100%",
              height: 350,
              marginTop: "20px",
            }}
          >

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={trendData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 10,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                />

                <YAxis
                  domain={[1, 5]}
                  ticks={[
                    1,
                    2,
                    3,
                    4,
                    5,
                  ]}
                  tickFormatter={
                    (value) => {

                      const labels = {
                        1: "Low",
                        2: "Anxious",
                        3: "Neutral",
                        4: "Calm",
                        5: "Happy",
                      };

                      return labels[
                        value
                      ];
                    }
                  }
                />

                <Tooltip
                  formatter={(
                    value,
                    name,
                    props
                  ) => {

                    const emotion =
                      props.payload
                        ?.emotion ||
                      "Neutral";

                    return [
                      `${getEmotionEmoji(
                        emotion
                      )} ${emotion}`,
                      "Mood",
                    ];

                  }}
                />

                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#5B8DEF"
                  strokeWidth={4}
                  dot={{
                    r: 6,
                    fill: "#5B8DEF",
                  }}
                  activeDot={{
                    r: 8,
                  }}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        )}

      </div>

      {/* =====================================
          VOICE CONNECTION
      ===================================== */}

      <div className="analytics-section">

        <h3>
          🎤 Voice Emotion Detection
        </h3>

        {voiceRecords === 0 ? (

          <div className="no-data">

            <div>
              🎤
            </div>

            <h3>
              No voice records yet
            </h3>

            <p>
              Go to Voice Emotion and
              record your voice.
            </p>

          </div>

        ) : (

          <div className="voice-success-card">

            <div className="voice-success-icon">
              🎤
            </div>

            <div>

              <h3>
                Voice Detection Connected
              </h3>

              <p>

                {voiceRecords} voice emotion{" "}

                {voiceRecords === 1
                  ? "record"
                  : "records"}{" "}

                added to your mood analytics.

              </p>

            </div>

          </div>

        )}

      </div>

      {/* =====================================
          RECENT RECORDS
      ===================================== */}

      <div className="analytics-section">

        <h3>
          🕒 Recent Mood Records
        </h3>

        {trendData.length === 0 ? (

          <div className="no-data">

            <div>
              📝
            </div>

            <h3>
              No mood records yet
            </h3>

            <p>
              Record a mood to see your
              history here.
            </p>

          </div>

        ) : (

          <div className="mood-history">

            {[...trendData]
              .reverse()
              .slice(0, 10)
              .map(
                (item, index) => (

                  <div
                    className="history-item"
                    key={index}
                  >

                    <div className="history-emoji">

                      {getEmotionEmoji(
                        item.emotion
                      )}

                    </div>

                    <div className="history-info">

                      <strong>
                        {item.emotion}
                      </strong>

                      <span>

                        {item.source ===
                        "voice"
                          ? "🎤 Voice Detection"
                          : "📊 Mood Tracker"}

                      </span>

                      {item.note && (
                        <small>
                          📝 {item.note}
                        </small>
                      )}

                    </div>

                    <div className="history-date">

                      {formatDate(
                        item.date
                      )}

                    </div>

                  </div>

                )
              )}

          </div>

        )}

      </div>

      {/* =====================================
          WELLNESS INSIGHT
      ===================================== */}

      <div className="insight-card">

        <div className="insight-icon">
          💡
        </div>

        <div>

          <h3>
            Your Wellness Insight
          </h3>

          {mostCommonMood ? (

            <p>

              Your most frequently recorded
              mood is{" "}

              <strong>
                {mostCommonMood.emoji}{" "}
                {mostCommonMood.mood}
              </strong>
              .

              {" "}
              Keep tracking your mood
              regularly to understand your
              emotional patterns.

            </p>

          ) : (

            <p>

              Start recording your moods
              using Mood Tracker or Voice
              Emotion Detection to receive
              wellness insights.

            </p>

          )}

        </div>

      </div>

    </div>
  );
}

export default MoodAnalytics;

