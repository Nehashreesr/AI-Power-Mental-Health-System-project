import React, {
  useRef,
  useState
} from "react";

import "./App.css";

import { auth } from "./firebase";

const API_URL =
  "http://127.0.0.1:5000";

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

        if (
          processorRef.current
        ) {
          processorRef.current.disconnect();
        }

        if (
          sourceRef.current
        ) {
          sourceRef.current.disconnect();
        }

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

        const audioBlob =
          createWavBlob(
            audioDataRef.current,
            audioContextRef.current
              .sampleRate
          );

        console.log(
          "WAV created:",
          audioBlob.size,
          "bytes"
        );

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
  // SEND AUDIO
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

        setEmotion(
          data.emotion
        );

        setConfidence(
          data.confidence
        );

        // Save to PostgreSQL
        await saveMood(
          data.emotion,
          data.confidence
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

      } finally {

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

        // Tell Dashboard / Analytics / Wellness
        // to reload their data
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

        throw err;
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

        {recording && (
          <p className="recording-text">
            🔴 Recording... Speak now
          </p>
        )}

        {loading && (
          <p className="voice-loading">
            🤖 Analyzing your voice...
          </p>
        )}

        {error && (
          <div className="voice-error">
            ❌ {error}
          </div>
        )}

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

            </div>
          )}

      </div>

    </div>
  );
}

export default VoiceEmotion;