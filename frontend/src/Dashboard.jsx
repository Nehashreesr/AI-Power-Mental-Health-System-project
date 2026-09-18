
import React, { useEffect, useState } from "react";
import "./App.css";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

import {
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";

const API_URL = "http://127.0.0.1:5000";

function Dashboard() {
  const [moods, setMoods] = useState([]);
  const [latestMood, setLatestMood] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================================
  // WELLNESS MODAL
  // =========================================

  const [selectedWellness, setSelectedWellness] =
    useState(null);

  // =========================================
  // MOOD COLORS
  // =========================================

  const moodColors = {
    Happy: "#FFD166",
    Calm: "#06D6A0",
    Neutral: "#8E9AAF",
    Sad: "#5B8DEF",
    Angry: "#EF476F",
    Fear: "#9B5DE5",
    Anxious: "#F8961E",
    Disgust: "#8E9AAF",
    Surprise: "#FF9F1C",
  };

  // =========================================
  // EMOTION EMOJI
  // =========================================

  const getEmotionEmoji = (emotion) => {
    const emojis = {
      Happy: "😊",
      Calm: "😌",
      Neutral: "😐",
      Sad: "😔",
      Angry: "😠",
      Fear: "😨",
      Anxious: "😟",
      Disgust: "🤢",
      Surprise: "😮",
    };

    return emojis[emotion] || "🧠";
  };

  // =========================================
  // FIX / FORMAT DATE
  // =========================================

  const getValidDate = (item) => {
    if (!item) return null;

    const possibleDate =
      item.created_at ||
      item.date ||
      item.createdAt ||
      item.timestamp ||
      item.time;

    if (!possibleDate) {
      return null;
    }

    const date = new Date(possibleDate);

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  };

  const formatDate = (item) => {
    const date = getValidDate(item);

    if (!date) {
      return "Date not available";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // =========================================
  // LOAD MOOD DATA FROM POSTGRESQL
  // =========================================

  const loadData = async (user) => {
    try {
      if (!user) {
        console.log(
          "Dashboard: No Firebase user logged in."
        );

        setMoods([]);
        setLatestMood(null);
        setLoading(false);
        return;
      }

      console.log(
        "Dashboard - Firebase UID:",
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
        "Dashboard - PostgreSQL moods:",
        savedMoods
      );

      /*
        Backend returns newest records first.

        We reverse them so the dashboard stores:
        oldest → newest

        This makes latestMood easy to calculate
        using the last item.
      */

      const fixedMoods = [...savedMoods]
        .reverse()
        .map((item) => {

          const validDate =
            getValidDate(item);

          return {
            ...item,

            date: validDate
              ? validDate.toISOString()
              : new Date().toISOString(),
          };
        });

      setMoods(fixedMoods);

      if (fixedMoods.length > 0) {
        setLatestMood(
          fixedMoods[
            fixedMoods.length - 1
          ]
        );
      } else {
        setLatestMood(null);
      }

    } catch (error) {
      console.error(
        "Dashboard - Error loading mood data:",
        error
      );

      setMoods([]);
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
          loadData(user);
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  // =========================================
  // TOTAL MOODS
  // =========================================

  const totalMoods = moods.length;

  // =========================================
  // VOICE RECORDS
  // =========================================

  const voiceRecords = moods.filter(
    (item) =>
      item.source === "voice"
  ).length;

  // =========================================
  // MOST COMMON MOOD
  // =========================================

  const getMostCommonMood = () => {
    if (moods.length === 0) {
      return null;
    }

    const counts = {};

    moods.forEach((item) => {
      const emotion =
        item.emotion ||
        item.mood ||
        "Neutral";

      counts[emotion] =
        (counts[emotion] || 0) + 1;
    });

    let mostCommon = null;
    let highestCount = 0;

    Object.entries(counts).forEach(
      ([emotion, count]) => {
        if (count > highestCount) {
          highestCount = count;

          mostCommon = {
            emotion,
            count,
          };
        }
      }
    );

    return mostCommon;
  };

  const mostCommonMood =
    getMostCommonMood();

  // =========================================
  // CURRENT EMOTION
  // =========================================

  const currentEmotion =
    latestMood?.emotion ||
    latestMood?.mood ||
    "Neutral";

  // =========================================
  // AI WELLNESS RECOMMENDATIONS
  // =========================================

  const getRecommendation = (emotion) => {
    const recommendations = {

      Happy: {
        music:
          "Upbeat & energetic music",

        musicDescription:
          "Keep your positive energy flowing with cheerful songs, feel-good playlists and energetic music.",

        musicUrl:
          "https://open.spotify.com/search/happy%20feel%20good%20music",

        exercise:
          "Dance workout or jogging",

        exerciseDetails: [
          "20-minute dance workout",
          "15-minute light jogging",
          "Outdoor walking",
          "Stretching",
        ],

        tip:
          "You are in a positive state. Enjoy activities that make you happy and maintain your healthy routine.",

        emoji: "😊",
      },

      Calm: {
        music:
          "Peaceful relaxing music",

        musicDescription:
          "Listen to soft instrumental, nature sounds, piano or relaxing meditation music to maintain your peaceful state.",

        musicUrl:
          "https://open.spotify.com/search/peaceful%20relaxing%20music",

        exercise:
          "Yoga or meditation",

        exerciseDetails: [
          "10-minute meditation",
          "Gentle yoga",
          "Deep breathing",
          "Light stretching",
        ],

        tip:
          "Your mind appears calm. Use this peaceful moment to slow down, breathe deeply and stay present.",

        emoji: "😌",
      },

      Neutral: {
        music:
          "Feel-good relaxing music",

        musicDescription:
          "Try chill, positive or soft instrumental music to gently improve your mood and energy.",

        musicUrl:
          "https://open.spotify.com/search/feel%20good%20relaxing%20music",

        exercise:
          "10-minute walk",

        exerciseDetails: [
          "10-minute walk",
          "Light stretching",
          "5-minute breathing",
          "Simple mobility exercises",
        ],

        tip:
          "Your mood is neutral. A little movement, fresh air and positive activities may help maintain your wellbeing.",

        emoji: "😐",
      },

      Sad: {
        music:
          "Comforting & healing music",

        musicDescription:
          "Choose gentle, calming and comforting music. Soft piano, acoustic and relaxing playlists may create a peaceful environment.",

        musicUrl:
          "https://open.spotify.com/search/calm%20healing%20music",

        exercise:
          "Gentle walking",

        exerciseDetails: [
          "10-minute slow walk",
          "Gentle stretching",
          "5-minute deep breathing",
          "Light yoga",
        ],

        tip:
          "Be gentle with yourself. Take things one step at a time and spend some time doing something comforting.",

        emoji: "😔",
      },

      Angry: {
        music:
          "Calming stress-relief music",

        musicDescription:
          "Try slow instrumental music, ambient sounds or calming playlists to create a more peaceful environment.",

        musicUrl:
          "https://open.spotify.com/search/stress%20relief%20music",

        exercise:
          "Walking & deep breathing",

        exerciseDetails: [
          "15-minute walk",
          "Slow deep breathing",
          "Full-body stretching",
          "Gentle yoga",
        ],

        tip:
          "Take a short pause before reacting. Give yourself some space and focus on slow, steady breathing.",

        emoji: "😠",
      },

      Fear: {
        music:
          "Soft meditation music",

        musicDescription:
          "Soft piano, nature sounds and meditation music can help create a calmer environment.",

        musicUrl:
          "https://open.spotify.com/search/soft%20meditation%20music",

        exercise:
          "Deep breathing",

        exerciseDetails: [
          "4-4 breathing",
          "Grounding exercise",
          "Gentle stretching",
          "Slow walking",
        ],

        tip:
          "Focus on the present moment. Take slow breaths and notice the things around you.",

        emoji: "😨",
      },

      Anxious: {
        music:
          "Relaxing meditation music",

        musicDescription:
          "Try slow instrumental music, nature sounds or guided meditation audio to create a calmer atmosphere.",

        musicUrl:
          "https://open.spotify.com/search/anxiety%20relief%20music",

        exercise:
          "Yoga & breathing exercise",

        exerciseDetails: [
          "4-4 breathing",
          "10-minute gentle yoga",
          "Slow walking",
          "Mindful stretching",
        ],

        tip:
          "Slow down and focus on your breathing. Give yourself a short break and return to the present moment.",

        emoji: "😟",
      },

      Disgust: {
        music:
          "Relaxing chill music",

        musicDescription:
          "Choose soft, comfortable music that helps you reset and create a peaceful environment.",

        musicUrl:
          "https://open.spotify.com/search/relaxing%20chill%20music",

        exercise:
          "Gentle stretching",

        exerciseDetails: [
          "Gentle stretching",
          "Short walk",
          "Deep breathing",
          "Light yoga",
        ],

        tip:
          "Take a short break and give yourself some comfortable space before continuing with your activities.",

        emoji: "🤢",
      },

      Surprise: {
        music:
          "Chill & positive music",

        musicDescription:
          "Choose positive and relaxing music while you take a moment to understand your emotions.",

        musicUrl:
          "https://open.spotify.com/search/chill%20positive%20music",

        exercise:
          "Light stretching",

        exerciseDetails: [
          "Light stretching",
          "Short walk",
          "Deep breathing",
          "Relaxation exercise",
        ],

        tip:
          "Take a moment to understand what you are feeling and allow yourself some time to process it.",

        emoji: "😮",
      },
    };

    return (
      recommendations[emotion] ||
      recommendations.Neutral
    );
  };

  const recommendation =
    getRecommendation(
      currentEmotion
    );

  // =========================================
  // OPEN WELLNESS DETAILS
  // =========================================

  const openWellness = (type) => {
    setSelectedWellness({
      type,
      recommendation,
    });
  };

  // =========================================
  // MOOD NAMES
  // =========================================

  const moodNames = [
    "Happy",
    "Calm",
    "Neutral",
    "Sad",
    "Angry",
    "Fear",
    "Anxious",
  ];

  // =========================================
  // MOOD BAR CHART
  // =========================================

  const moodChartData =
    moodNames.map((mood) => {

      const count =
        moods.filter(
          (item) => {

            const emotion =
              item.emotion ||
              item.mood ||
              "";

            return (
              emotion.toLowerCase() ===
              mood.toLowerCase()
            );
          }
        ).length;

      return {
        name: mood,
        count: count,
        color: moodColors[mood],
      };
    });

  // =========================================
  // PIE CHART
  // =========================================

  const pieData =
    moodChartData.filter(
      (item) =>
        item.count > 0
    );

  // =========================================
  // MOOD TREND
  // =========================================

  const emotionScore = {
    Happy: 5,
    Calm: 4,
    Neutral: 3,
    Sad: 2,
    Fear: 2,
    Anxious: 2,
    Angry: 1,
  };

  const trendData =
    moods
      .slice(-10)
      .map((item, index) => {

        const emotion =
          item.emotion ||
          item.mood ||
          "Neutral";

        return {
          name: `#${index + 1}`,
          mood:
            emotionScore[emotion] || 3,
          emotion: emotion,
        };
      });

  // =========================================
  // CLOSE MODAL
  // =========================================

  const closeWellness = () => {
    setSelectedWellness(null);
  };

  // =========================================
  // LOADING SCREEN
  // =========================================

  if (loading) {
    return (
      <div className="dashboard-home">

        <div className="dashboard-welcome">

          <div>
            <h2>
              Welcome to MindCare AI 💙
            </h2>

            <p>
              Your personal AI wellness
              companion. Track your mood,
              understand your emotions,
              and take care of your mind.
            </p>
          </div>

          <div className="dashboard-welcome-icon">
            🧠
          </div>

        </div>

        <div className="dashboard-empty">

          <div>📊</div>

          <h3>
            Loading your dashboard...
          </h3>

          <p>
            Retrieving your personal mood
            records.
          </p>

        </div>

      </div>
    );
  }

  // =========================================
  // UI
  // =========================================

  return (
    <div className="dashboard-home">

      {/* =====================================
          WELCOME
      ===================================== */}

      <div className="dashboard-welcome">

        <div>

          <h2>
            Welcome to MindCare AI 💙
          </h2>

          <p>
            Your personal AI wellness
            companion. Track your mood,
            understand your emotions,
            and take care of your mind.
          </p>

        </div>

        <div className="dashboard-welcome-icon">
          🧠
        </div>

      </div>

      {/* =====================================
          SUMMARY CARDS
      ===================================== */}

      <div className="dashboard-summary">

        <div className="dashboard-summary-card">

          <div className="dashboard-summary-icon">
            📊
          </div>

          <div>

            <h3>
              Mood Records
            </h3>

            <strong>
              {totalMoods}
            </strong>

            <p>
              Total entries
            </p>

          </div>

        </div>

        <div className="dashboard-summary-card">

          <div className="dashboard-summary-icon">

            {latestMood
              ? getEmotionEmoji(
                  currentEmotion
                )
              : "💭"}

          </div>

          <div>

            <h3>
              Latest Mood
            </h3>

            <strong>
              {latestMood
                ? currentEmotion
                : "No data"}
            </strong>

            <p>
              Most recent record
            </p>

          </div>

        </div>

        <div className="dashboard-summary-card">

          <div className="dashboard-summary-icon">
            🎤
          </div>

          <div>

            <h3>
              Voice Records
            </h3>

            <strong>
              {voiceRecords}
            </strong>

            <p>
              Voice detections
            </p>

          </div>

        </div>

        <div className="dashboard-summary-card">

          <div className="dashboard-summary-icon">

            {mostCommonMood
              ? getEmotionEmoji(
                  mostCommonMood.emotion
                )
              : "📈"}

          </div>

          <div>

            <h3>
              Common Mood
            </h3>

            <strong>
              {mostCommonMood
                ? mostCommonMood.emotion
                : "No data"}
            </strong>

            <p>

              {mostCommonMood
                ? `${mostCommonMood.count} entries`
                : "Start tracking"}

            </p>

          </div>

        </div>

      </div>

      {/* =====================================
          MOOD DISTRIBUTION
      ===================================== */}

      <div className="dashboard-section">

        <div className="dashboard-section-header">

          <h3>
            📊 Mood Distribution
          </h3>

          <p>
            See how frequently each mood
            has been recorded.
          </p>

        </div>

        {totalMoods === 0 ? (

          <div className="dashboard-empty">

            <div>📊</div>

            <h3>
              No mood data yet
            </h3>

            <p>
              Start tracking your mood
              to see your graph.
            </p>

          </div>

        ) : (

          <div
            className="dashboard-chart"
            style={{
              width: "100%",
              height: 350,
            }}
          >

            <ResponsiveContainer>

              <BarChart
                data={moodChartData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity={0.25}
                />

                <XAxis
                  dataKey="name"
                />

                <YAxis
                  allowDecimals={false}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  name="Mood Records"
                  radius={[
                    10,
                    10,
                    0,
                    0,
                  ]}
                >

                  {moodChartData.map(
                    (entry, index) => (

                      <Cell
                        key={`bar-${index}`}
                        fill={entry.color}
                      />

                    )
                  )}

                </Bar>

              </BarChart>

            </ResponsiveContainer>

          </div>

        )}

      </div>

      {/* =====================================
          MOOD COMPOSITION
      ===================================== */}

      <div className="dashboard-section">

        <div className="dashboard-section-header">

          <h3>
            🎭 Mood Composition
          </h3>

          <p>
            Percentage of your recorded
            moods.
          </p>

        </div>

        {pieData.length === 0 ? (

          <div className="dashboard-empty">

            <div>🥧</div>

            <h3>
              No mood data available
            </h3>

            <p>
              Record some moods to see
              your composition.
            </p>

          </div>

        ) : (

          <div
            className="dashboard-chart"
            style={{
              width: "100%",
              height: 430,
            }}
          >

            <ResponsiveContainer>

              <PieChart>

                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={135}
                  innerRadius={75}
                  paddingAngle={5}
                  label={({
                    name,
                    percent,
                  }) =>
                    `${name} ${(
                      percent * 100
                    ).toFixed(0)}%`
                  }
                  labelLine={false}
                >

                  {pieData.map(
                    (entry, index) => (

                      <Cell
                        key={`pie-${index}`}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={3}
                      />

                    )
                  )}

                </Pie>

                <Tooltip />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          </div>

        )}

      </div>

      {/* =====================================
          MOOD TREND
      ===================================== */}

      <div className="dashboard-section">

        <div className="dashboard-section-header">

          <h3>
            📈 Recent Mood Trend
          </h3>

          <p>
            Your latest emotional records.
          </p>

        </div>

        {trendData.length === 0 ? (

          <div className="dashboard-empty">

            <div>📈</div>

            <h3>
              No trend data
            </h3>

            <p>
              Record moods to see your trend.
            </p>

          </div>

        ) : (

          <div
            className="dashboard-chart"
            style={{
              width: "100%",
              height: 350,
            }}
          >

            <ResponsiveContainer>

              <LineChart
                data={trendData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity={0.25}
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
                  tickFormatter={(value) => {

                    const names = {
                      1: "Angry",
                      2: "Sad",
                      3: "Neutral",
                      4: "Calm",
                      5: "Happy",
                    };

                    return names[value];
                  }}
                />

                <Tooltip
                  formatter={(
                    value,
                    name,
                    props
                  ) => [

                    `${getEmotionEmoji(
                      props.payload.emotion
                    )} ${
                      props.payload.emotion
                    }`,

                    "Mood",

                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="mood"
                  name="Mood"
                  stroke="#6366F1"
                  strokeWidth={4}
                  dot={{
                    r: 6,
                    fill: "#6366F1",
                  }}
                  activeDot={{
                    r: 9,
                  }}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        )}

      </div>

      {/* =====================================
          LATEST EMOTIONAL STATUS
      ===================================== */}

      <div className="dashboard-section">

        <div className="dashboard-section-header">

          <h3>
            🧠 Latest Emotional Status
          </h3>

        </div>

        {latestMood ? (

          <div className="dashboard-latest-mood">

            <div className="dashboard-mood-emoji">

              {getEmotionEmoji(
                currentEmotion
              )}

            </div>

            <div>

              <h2>
                {currentEmotion}
              </h2>

              <p>

                Detected from{" "}

                <strong>

                  {latestMood.source ===
                  "voice"
                    ? "🎤 Voice Emotion"
                    : "📊 Mood Tracker"}

                </strong>

              </p>

              {latestMood.confidence !==
                undefined &&
                latestMood.confidence !==
                  null && (

                  <p>

                    Confidence:{" "}

                    {(
                      latestMood.confidence *
                      100
                    ).toFixed(1)}

                    %

                  </p>

                )}

              <small>

                Recorded:{" "}
                {formatDate(
                  latestMood
                )}

              </small>

            </div>

          </div>

        ) : (

          <div className="dashboard-empty">

            <div>💭</div>

            <h3>
              No mood data yet
            </h3>

            <p>
              Start tracking your mood
              to see your emotional
              status here.
            </p>

          </div>

        )}

      </div>

      {/* =====================================
          AI WELLNESS RECOMMENDATION
      ===================================== */}

      <div className="dashboard-section">

        <div className="dashboard-section-header">

          <h3>
            🤖 AI Wellness Recommendation
          </h3>

          <p>
            Personalized recommendations
            based on your latest mood.
          </p>

        </div>

        {latestMood ? (

          <div className="dashboard-wellness">

            {/* MUSIC */}

            <button
              className="dashboard-wellness-item wellness-clickable"
              onClick={() =>
                openWellness("music")
              }
            >

              <div className="dashboard-wellness-icon">
                🎵
              </div>

              <div>

                <h3>
                  Music
                </h3>

                <p>
                  {recommendation.music}
                </p>

                <span className="wellness-view">
                  View recommendation →
                </span>

              </div>

            </button>

            {/* EXERCISE */}

            <button
              className="dashboard-wellness-item wellness-clickable"
              onClick={() =>
                openWellness("exercise")
              }
            >

              <div className="dashboard-wellness-icon">
                🏃
              </div>

              <div>

                <h3>
                  Exercise
                </h3>

                <p>
                  {recommendation.exercise}
                </p>

                <span className="wellness-view">
                  View exercises →
                </span>

              </div>

            </button>

            {/* WELLNESS TIP */}

            <button
              className="dashboard-wellness-item wellness-clickable"
              onClick={() =>
                openWellness("tip")
              }
            >

              <div className="dashboard-wellness-icon">
                💡
              </div>

              <div>

                <h3>
                  Wellness Tip
                </h3>

                <p>
                  {recommendation.tip}
                </p>

                <span className="wellness-view">
                  View wellness tip →
                </span>

              </div>

            </button>

          </div>

        ) : (

          <div className="dashboard-empty">

            <p>
              Record your first mood to
              receive personalized wellness
              recommendations.
            </p>

          </div>

        )}

      </div>

      {/* =====================================
          RECENT MOOD RECORDS
      ===================================== */}

      <div className="dashboard-section">

        <div className="dashboard-section-header">

          <h3>
            🕒 Recent Mood Records
          </h3>

          <p>
            Your latest mood tracking history.
          </p>

        </div>

        {moods.length > 0 ? (

          <div className="dashboard-recent-list">

            {[...moods]
              .reverse()
              .slice(0, 10)
              .map((item, index) => {

                const itemEmotion =
                  item.emotion ||
                  item.mood ||
                  "Neutral";

                return (

                  <div
                    className="dashboard-recent-item"
                    key={`${index}-${item.date}`}
                  >

                    <div
                      className="recent-mood-icon"
                      style={{
                        background:
                          moodColors[
                            itemEmotion
                          ] ||
                          "#8E9AAF",
                      }}
                    >

                      {getEmotionEmoji(
                        itemEmotion
                      )}

                    </div>

                    <div className="recent-mood-info">

                      <strong>
                        {itemEmotion}
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

                    <div className="recent-mood-date">

                      <span>
                        📅
                      </span>

                      <small>
                        {formatDate(item)}
                      </small>

                    </div>

                  </div>

                );
              })}

          </div>

        ) : (

          <div className="dashboard-empty">

            <div>📊</div>

            <h3>
              No recent mood records
            </h3>

            <p>
              Record your first mood to
              see your history here.
            </p>

          </div>

        )}

      </div>

      {/* =====================================
          FOOTER
      ===================================== */}

      <div className="dashboard-footer-message">

        💙 Remember: your emotional
        well-being matters. Take care
        of yourself one day at a time.

      </div>

      {/* =====================================
          WELLNESS POPUP
      ===================================== */}

      {selectedWellness && (

        <div
          className="wellness-modal-overlay"
          onClick={closeWellness}
        >

          <div
            className="wellness-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="wellness-close"
              onClick={closeWellness}
            >
              ✕
            </button>

            <div className="wellness-modal-icon">

              {selectedWellness.type ===
                "music" && "🎵"}

              {selectedWellness.type ===
                "exercise" && "🏃"}

              {selectedWellness.type ===
                "tip" && "💡"}

            </div>

            <p className="wellness-modal-label">
              AI Wellness Recommendation
            </p>

            <h2>

              {selectedWellness.type ===
                "music" &&
                "Music for Your Mood"}

              {selectedWellness.type ===
                "exercise" &&
                "Exercise for Your Mood"}

              {selectedWellness.type ===
                "tip" &&
                "Wellness Tip"}

            </h2>

            {/* MUSIC OUTPUT */}

            {selectedWellness.type ===
              "music" && (

              <>

                <div className="wellness-output-box">

                  <h3>

                    🎵{" "}

                    {
                      selectedWellness
                        .recommendation
                        .music
                    }

                  </h3>

                  <p>

                    {
                      selectedWellness
                        .recommendation
                        .musicDescription
                    }

                  </p>

                </div>

                <a
                  href={
                    selectedWellness
                      .recommendation
                      .musicUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wellness-spotify-button"
                >
                  🎧 Listen on Spotify
                </a>

              </>

            )}

            {/* EXERCISE OUTPUT */}

            {selectedWellness.type ===
              "exercise" && (

              <div className="wellness-output-box">

                <h3>
                  🏃 Recommended Activities
                </h3>

                <div className="wellness-exercise-list">

                  {selectedWellness
                    .recommendation
                    .exerciseDetails
                    .map(
                      (
                        exercise,
                        index
                      ) => (

                        <div
                          className="wellness-exercise-row"
                          key={index}
                        >

                          <span>
                            ✓
                          </span>

                          <p>
                            {exercise}
                          </p>

                        </div>

                      )
                    )}

                </div>

              </div>

            )}

            {/* TIP OUTPUT */}

            {selectedWellness.type ===
              "tip" && (

              <div className="wellness-output-box">

                <h3>
                  💡 Personalized Wellness Tip
                </h3>

                <p className="wellness-tip-text">

                  {
                    selectedWellness
                      .recommendation
                      .tip
                  }

                </p>

              </div>

            )}

            <div className="wellness-modal-mood">

              {getEmotionEmoji(
                currentEmotion
              )}

              <span>

                Based on your latest mood:{" "}

                <strong>
                  {currentEmotion}
                </strong>

              </span>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Dashboard;

