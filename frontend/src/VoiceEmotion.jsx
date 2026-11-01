import React, {
  useRef,
  useState
} from "react";

import "./App.css";

import { auth } from "./firebase";

const API_URL =
  "http://127.0.0.1:5000";

// =========================================
// WELLNESS INDICATOR (low mood / stress-anxiety signs)
// =========================================
/*
 The voice model detects Happy, Neutral, Sad and Angry.
 It cannot diagnose depression or anxiety, so this gives a
 wellness INDICATOR: it looks at the current result and at
 the user's last few voice check-ins and flags patterns of
 low mood (depression-related) or tension (stress/anxiety-related).
*/
const VOICE_HISTORY_LIMIT = 10;
const VOICE_WINDOW = 5;

const LOW_MOOD_EMOTIONS = ["Sad"];
const TENSION_EMOTIONS = ["Angry", "Anxious", "Fear"];

const voiceHistoryKey = (uid) =>
  `mindcareVoiceHistory_${uid}`;

const loadVoiceHistory = (uid) => {
  try {
    const raw = localStorage.getItem(voiceHistoryKey(uid));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const addToVoiceHistory = (uid, emotion, confidence) => {
  const list = loadVoiceHistory(uid);
  list.push({ emotion, confidence, time: Date.now() });
  const trimmed = list.slice(-VOICE_HISTORY_LIMIT);
  try {
    localStorage.setItem(
      voiceHistoryKey(uid),
      JSON.stringify(trimmed)
    );
  } catch {
    // Storage full or blocked: the indicator still works for this result.
  }
  return trimmed;
};

const analyzeWellness = (emotion, confidence, history) => {
  const recent = history.slice(-VOICE_WINDOW);
  const sadCount = recent.filter((item) =>
    LOW_MOOD_EMOTIONS.includes(item.emotion)
  ).length;
  const tenseCount = recent.filter((item) =>
    TENSION_EMOTIONS.includes(item.emotion)
  ).length;
  const distressCount = sadCount + tenseCount;

  const currentLow = LOW_MOOD_EMOTIONS.includes(emotion);
  const currentTense = TENSION_EMOTIONS.includes(emotion);
  const strong = Number(confidence) >= 0.5;

  // What kind of signs dominate?
  let kind = "none";
  if (sadCount > 0 && tenseCount > 0 && Math.abs(sadCount - tenseCount) <= 1) {
    kind = "mixed";
  } else if (sadCount >= tenseCount && sadCount > 0) {
    kind = "low";
  } else if (tenseCount > 0) {
    kind = "tense";
  }

  const titles = {
    low: "Possible low-mood (depression-related) signs",
    tense: "Possible stress / anxiety-related signs",
    mixed: "Possible emotional distress (low mood and stress)"
  };

  const details = {
    low: "Your voice sounds sad or low in energy.",
    tense: "Your voice sounds tense or irritated.",
    mixed: "Your voice shows both sadness and tension."
  };

  // HIGH: most recent check-ins show distress
  if (recent.length >= VOICE_WINDOW && distressCount >= 4) {
    return {
      level: "high",
      levelLabel: "High",
      color: "#ef4444",
      title: titles[kind],
      detail:
        `${distressCount} of your last ${recent.length} voice check-ins ` +
        "showed these signs. This looks like a repeated pattern.",
      tip:
        "Please consider talking to a trusted person or a mental " +
        "health professional. You can also open the Safety Support page.",
      sessions: recent.length
    };
  }

  // MODERATE: repeated signs
  if (sadCount >= 3 || tenseCount >= 3) {
    return {
      level: "moderate",
      levelLabel: "Moderate",
      color: "#f97316",
      title: titles[kind],
      detail:
        `${distressCount} of your last ${recent.length} voice check-ins ` +
        "showed these signs.",
      tip:
        "Try a break, slow breathing, a walk, or talking to someone " +
        "you trust. If this continues, speak to a professional.",
      sessions: recent.length
    };
  }

  // MILD: this recording alone
  if ((currentLow || currentTense) && strong) {
    const single = currentLow ? "low" : "tense";
    return {
      level: "mild",
      levelLabel: "Mild",
      color: "#eab308",
      title: titles[single],
      detail:
        details[single] +
        " One recording is not enough to see a pattern.",
      tip:
        "Check in again over the next few days so MindCare AI can " +
        "see whether this continues.",
      sessions: recent.length
    };
  }

  // NONE
  return {
    level: "none",
    levelLabel: "No concerning signs",
    color: "#22c55e",
    title: "No signs of low mood or stress detected",
    detail: "Your voice does not show a concerning pattern right now.",
    tip: "Keep checking in regularly to track how you feel over time.",
    sessions: recent.length
  };
};

function VoiceEmotion() {

  const [recording, setRecording] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [emotion, setEmotion] =
    useState("");

  const [confidence, setConfidence] =
    useState(null);

  const [error, setError] =
    useState("");
  const [wellness, setWellness] =
    useState(null);

  const streamRef =
    useRef(null);

  const audioContextRef =
    useRef(null);

  const processorRef =
    useRef(null);

  const sourceRef =
    useRef(null);

  const audioDataRef =
    useRef([]);

  // =========================================
  // START RECORDING
  // =========================================

  const startRecording =
    async () => {

      try {

        setError("");
        setEmotion("");
        setConfidence(null);
        setWellness(null);

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true
            }
          );

        streamRef.current =
          stream;

        const AudioContext =
          window.AudioContext ||
          window.webkitAudioContext;

        const audioContext =
          new AudioContext();

        audioContextRef.current =
          audioContext;

        const source =
          audioContext.createMediaStreamSource(
            stream
          );

        sourceRef.current =
          source;

        const processor =
          audioContext.createScriptProcessor(
            4096,
            1,
            1
          );

        processorRef.current =
          processor;

        audioDataRef.current =
          [];

        processor.onaudioprocess =
          (event) => {

            const input =
              event.inputBuffer
                .getChannelData(0);

            audioDataRef.current.push(
              new Float32Array(input)
            );
          };

        source.connect(
          processor
        );

        processor.connect(
          audioContext.destination
        );

        setRecording(true);

        console.log(
          "Recording started"
        );

      } catch (err) {

        console.error(
          "Microphone error:",
          err
        );

        setError(
          "Microphone permission is required. Please allow microphone access."
        );
      }
    };

  // =========================================
  // STOP RECORDING
  // =========================================

  const stopRecording =
    async () => {

      try {

        setRecording(false);

        // Stop processor
        if (
          processorRef.current
        ) {

          processorRef.current.disconnect();

          processorRef.current.onaudioprocess =
            null;
        }

        // Stop source
        if (
          sourceRef.current
        ) {

          sourceRef.current.disconnect();
        }

        // Stop microphone
        if (
          streamRef.current
        ) {

          streamRef.current
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            );
        }

        if (
          !audioContextRef.current
        ) {

          throw new Error(
            "Audio context is not available."
          );
        }

        const sampleRate =
          audioContextRef.current
            .sampleRate;

        const audioBlob =
          createWavBlob(
            audioDataRef.current,
            sampleRate
          );

        console.log(
          "WAV created:",
          audioBlob.size,
          "bytes"
        );

        // Close audio context
        try {

          await audioContextRef.current.close();

        } catch (closeError) {

          console.log(
            "Audio context close:",
            closeError
          );
        }

        audioContextRef.current =
          null;

        processorRef.current =
          null;

        sourceRef.current =
          null;

        streamRef.current =
          null;

        // Send audio for analysis
        await sendAudio(
          audioBlob
        );

      } catch (err) {

        console.error(
          "Stop recording error:",
          err
        );

        setError(
          err.message ||
            "Could not process recording."
        );
      }
    };

  // =========================================
  // CREATE WAV FILE
  // =========================================

  const createWavBlob =
    (
      audioChunks,
      sampleRate
    ) => {

      let totalLength = 0;

      audioChunks.forEach(
        (chunk) => {
          totalLength +=
            chunk.length;
        }
      );

      const samples =
        new Float32Array(
          totalLength
        );

      let offset = 0;

      audioChunks.forEach(
        (chunk) => {

          samples.set(
            chunk,
            offset
          );

          offset +=
            chunk.length;
        }
      );

      const buffer =
        new ArrayBuffer(
          44 +
          samples.length * 2
        );

      const view =
        new DataView(buffer);

      writeString(
        view,
        0,
        "RIFF"
      );

      view.setUint32(
        4,
        36 +
          samples.length * 2,
        true
      );

      writeString(
        view,
        8,
        "WAVE"
      );

      writeString(
        view,
        12,
        "fmt "
      );

      view.setUint32(
        16,
        16,
        true
      );

      view.setUint16(
        20,
        1,
        true
      );

      view.setUint16(
        22,
        1,
        true
      );

      view.setUint32(
        24,
        sampleRate,
        true
      );

      view.setUint32(
        28,
        sampleRate * 2,
        true
      );

      view.setUint16(
        32,
        2,
        true
      );

      view.setUint16(
        34,
        16,
        true
      );

      writeString(
        view,
        36,
        "data"
      );

      view.setUint32(
        40,
        samples.length * 2,
        true
      );

      floatTo16BitPCM(
        view,
        44,
        samples
      );

      return new Blob(
        [view],
        {
          type: "audio/wav"
        }
      );
    };

  // =========================================
  // WRITE STRING
  // =========================================

  const writeString =
    (
      view,
      offset,
      string
    ) => {

      for (
        let i = 0;
        i < string.length;
        i++
      ) {

        view.setUint8(
          offset + i,
          string.charCodeAt(i)
        );
      }
    };

  // =========================================
  // CONVERT AUDIO
  // =========================================

  const floatTo16BitPCM =
    (
      output,
      offset,
      input
    ) => {

      for (
        let i = 0;
        i < input.length;
        i++
      ) {

        let sample =
          Math.max(
            -1,
            Math.min(
              1,
              input[i]
            )
          );

        sample =
          sample < 0
            ? sample * 0x8000
            : sample * 0x7fff;

        output.setInt16(
          offset + i * 2,
          sample,
          true
        );
      }
    };

  // =========================================
  // SEND AUDIO TO BACKEND
  // =========================================

  const sendAudio =
    async (audioBlob) => {

      try {

        setLoading(true);
        setError("");

        const user =
          auth.currentUser;

        if (!user) {

          throw new Error(
            "Please log in before using Voice Emotion Detection."
          );
        }

        const formData =
          new FormData();

        formData.append(
          "audio",
          audioBlob,
          "voice.wav"
        );

        console.log(
          "Sending WAV audio to backend..."
        );

        const response =
          await fetch(
            `${API_URL}/predict-voice`,
            {
              method: "POST",
              body: formData
            }
          );

        const data =
          await response.json();

        console.log(
          "Backend response:",
          data
        );

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.error ||
              "Voice emotion detection failed"
          );
        }

        // =====================================
        // SHOW RESULT IMMEDIATELY
        // =====================================

        setEmotion(
          data.emotion
        );

        setConfidence(
          data.confidence
        );

        // =====================================
        // WELLNESS INDICATOR (low mood / stress)
        // =====================================
        const history = addToVoiceHistory(
          user.uid,
          data.emotion,
          data.confidence
        );

        setWellness(
          analyzeWellness(
            data.emotion,
            data.confidence,
            history
          )
        );

        /*
         IMPORTANT:

         Do NOT wait for PostgreSQL here.

         The emotion result is already available,
         so show it immediately.
        */

        setLoading(false);

        // =====================================
        // SAVE MOOD IN BACKGROUND
        // =====================================

        saveMood(
          data.emotion,
          data.confidence
        ).catch(
          (saveError) => {

            console.error(
              "Background mood save error:",
              saveError
            );

          }
        );

      } catch (err) {

        console.error(
          "Voice error:",
          err
        );

        setError(
          err.message ||
            "Voice analysis failed"
        );

        setLoading(false);
      }
    };

  // =========================================
  // SAVE VOICE MOOD TO POSTGRESQL
  // =========================================

  const saveMood =
    async (
      detectedEmotion,
      detectedConfidence
    ) => {

      try {

        const user =
          auth.currentUser;

        if (!user) {

          throw new Error(
            "User is not logged in."
          );
        }

        console.log(
          "Saving voice mood to PostgreSQL..."
        );

        const response =
          await fetch(
            `${API_URL}/moods`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                firebase_uid:
                  user.uid,

                mood:
                  detectedEmotion,

                source:
                  "voice",

                confidence:
                  detectedConfidence,

                note:
                  "Detected using voice emotion analysis."
              })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          throw new Error(
            data.error ||
              "Failed to save mood"
          );
        }

        console.log(
          "Voice mood saved to PostgreSQL:",
          data
        );

        // =====================================
        // UPDATE OTHER COMPONENTS
        // =====================================

        window.dispatchEvent(
          new Event(
            "moodUpdated"
          )
        );

      } catch (err) {

        console.error(
          "Database save error:",
          err
        );

        /*
         Do not show a blocking error
         after the emotion has already
         been detected successfully.
        */

        console.log(
          "Emotion detected successfully, but database save failed."
        );
      }
    };

  // =========================================
  // EMOTION EMOJI
  // =========================================

  const getEmotionEmoji =
    (value) => {

      const emojis = {

        Happy: "😊",

        Sad: "😔",

        Angry: "😠",

        Neutral: "😐",

        Fear: "😨",

        Disgust: "🤢",

        Surprise: "😮",

        Calm: "😌",

        Anxious: "😟"
      };

      return (
        emojis[value] ||
        "🧠"
      );
    };

  // =========================================
  // UI
  // =========================================

  return (
    <div className="voice-page">

      <div className="voice-card">

        <div className="voice-icon">
          🎤
        </div>

        <h2>
          Voice Emotion Detection
        </h2>

        <p>
          Speak naturally and MindCare AI
          will analyze your voice emotion.
        </p>

        {/* ===================================
            RECORD BUTTON
        =================================== */}

        {!recording ? (

          <button
            className="voice-record-button"
            onClick={
              startRecording
            }
            disabled={loading}
          >
            🎤 Start Recording
          </button>

        ) : (

          <button
            className="voice-record-button recording"
            onClick={
              stopRecording
            }
          >
            ⏹️ Stop Recording
          </button>

        )}

        {/* ===================================
            RECORDING
        =================================== */}

        {recording && (

          <p className="recording-text">
            🔴 Recording... Speak now
          </p>

        )}

        {/* ===================================
            ANALYZING
        =================================== */}

        {loading && (

          <p className="voice-loading">
            🤖 Analyzing your voice...
          </p>

        )}

        {/* ===================================
            ERROR
        =================================== */}

        {error && (

          <div className="voice-error">
            ❌ {error}
          </div>

        )}

        {/* ===================================
            EMOTION RESULT
        =================================== */}

        {emotion &&
          !loading && (

            <div className="emotion-result">

              <div className="emotion-result-icon">

                {getEmotionEmoji(
                  emotion
                )}

              </div>

              <h3>
                Detected Emotion
              </h3>

              <div className="emotion-name">
                {emotion}
              </div>

              {confidence !== null && (

                <div className="confidence">

                  Confidence:{" "}

                  {(
                    confidence * 100
                  ).toFixed(1)}

                  %

                </div>

              )}

              <p>
                💾 Mood saved to Mood Analytics
              </p>

              {wellness && (
                <div
                  className="wellness-indicator"
                  style={{
                    marginTop: "18px",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    borderLeft: `5px solid ${wellness.color}`,
                    background: "rgba(127,127,127,0.12)",
                    textAlign: "left"
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "6px" }}>
                    🩺 Wellness indicator:{" "}
                    <span style={{ color: wellness.color }}>
                      {wellness.levelLabel}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600 }}>
                    {wellness.title}
                  </div>

                  <p style={{ margin: "6px 0" }}>
                    {wellness.detail}
                  </p>

                  <p style={{ margin: "6px 0" }}>
                    💡 {wellness.tip}
                  </p>

                  <p
                    style={{
                      fontSize: "12px",
                      opacity: 0.75,
                      margin: "10px 0 0"
                    }}
                  >
                    This is a wellness indicator based on voice tone
                    only. It is not a medical diagnosis. Only a doctor
                    or psychologist can diagnose depression or anxiety.
                  </p>
                </div>
              )}

            </div>

          )}

      </div>

    </div>
  );
}

export default VoiceEmotion;