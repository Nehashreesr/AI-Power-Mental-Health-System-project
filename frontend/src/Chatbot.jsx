import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:5000";

const welcomeMessage = {
  role: "assistant",
  content:
    "Hi! I'm MindCare AI 💙 I'm here to listen and support your general wellness. How are you feeling today?"
};

function Chatbot() {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  /* =========================
     AUTO SCROLL
  ========================= */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  /* =========================
     SEND MESSAGE
  ========================= */
  const sendMessage = async (customMessage = null) => {
    const text = (customMessage ?? input).trim();

    if (!text || loading) return;

    const userMessage = {
      role: "user",
      content: text
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Backend error");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "I'm here to listen.",
          type: data.type || "ai"
        }
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting to MindCare AI. Please make sure the Flask backend is running.",
          type: "error"
        }
      ]);
    } finally {
      setLoading(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  /* =========================
     ENTER KEY
  ========================= */
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  /* =========================
     CLEAR CHAT
  ========================= */
  const clearChat = () => {
    setMessages([welcomeMessage]);
    setInput("");
    inputRef.current?.focus();
  };

  /* =========================
     TEXT TO SPEECH
  ========================= */
  const speakMessage = (text) => {
    if (!("speechSynthesis" in window)) {
      alert(
        "Text-to-speech is not supported in this browser."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.rate = 0.95;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
  };

  /* =========================
     VOICE INPUT
  ========================= */
  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input is not supported. Try Google Chrome or Microsoft Edge."
      );
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      setInput((previous) =>
        previous
          ? `${previous} ${transcript}`
          : transcript
      );
    };

    recognition.onerror = (event) => {
      console.error("Voice error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    recognition.start();
  };

  /* =========================
     QUICK PROMPTS
  ========================= */
  const quickPrompts = [
    "I feel sad today",
    "I'm feeling stressed",
    "I feel lonely",
    "I need some motivation"
  ];

  return (
    <div className="chat-page">

      {/* =========================
          HEADER
      ========================= */}
      <header className="chat-header">

        <div className="chat-title">

          <div className="chat-header-icon">
            🧠
          </div>

          <div>
            <h2>MindCare AI</h2>
            <p>Wellness Companion</p>
          </div>

        </div>

        <div className="chat-header-actions">

          <button
            className="clear-button"
            onClick={clearChat}
          >
            🧹 Clear Chat
          </button>

        </div>

      </header>

      {/* =========================
          WELCOME
      ========================= */}
      <section className="welcome">

        <div className="welcome-icon">
          🌿
        </div>

        <h2>
          How are you feeling today?
        </h2>

        <p>
          Share what's on your mind.
          I'm here to provide supportive
          general wellness guidance.
        </p>

      </section>

      {/* =========================
          QUICK PROMPTS
      ========================= */}
      <div className="quick-prompts">

        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => sendMessage(prompt)}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}

      </div>

      {/* =========================
          CHAT AREA
      ========================= */}
      <section className="chat-container">

        <div className="messages">

          {messages.map((message, index) => (

            <div
              key={index}
              className={
                message.role === "user"
                  ? "message user"
                  : "message assistant"
              }
            >

              {message.role === "assistant" && (
                <div className="bot-avatar">
                  🧠
                </div>
              )}

              <div className="message-content">

                <div
                  className={
                    message.type === "error"
                      ? "bubble error-bubble"
                      : "bubble"
                  }
                >
                  {message.content}
                </div>

                {/* LISTEN BUTTON */}
                {message.role === "assistant" &&
                  message.type !== "error" && (

                  <button
                    className="speak-button"
                    onClick={() =>
                      speakMessage(message.content)
                    }
                  >
                    🔊 Listen
                  </button>

                )}

              </div>

            </div>

          ))}

          {/* =========================
              TYPING
          ========================= */}
          {loading && (

            <div className="message assistant">

              <div className="bot-avatar">
                🧠
              </div>

              <div className="bubble typing">
                <span></span>
                <span></span>
                <span></span>
              </div>

            </div>

          )}

          <div ref={chatEndRef}></div>

        </div>

        {/* =========================
            INPUT
        ========================= */}
        <div className="input-container">

          {/* VOICE */}
          <button
            className={
              listening
                ? "voice-button listening"
                : "voice-button"
            }
            onClick={startVoiceInput}
            title="Voice input"
          >
            🎤
          </button>

          {/* TEXT */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder={
              listening
                ? "Listening..."
                : "Tell me how you're feeling..."
            }
            rows="1"
            disabled={loading}
          />

          {/* SEND */}
          <button
            className="send-button"
            onClick={() => sendMessage()}
            disabled={
              loading || !input.trim()
            }
          >
            ➤
          </button>

        </div>

        <p className="input-hint">
          Enter to send • Shift + Enter for a new line
        </p>

      </section>

      {/* =========================
          FOOTER
      ========================= */}
      <footer>

        <p>
          💙 MindCare AI provides general
          wellness information and emotional
          support.
        </p>

        <p>
          It is not a substitute for
          professional medical care.
        </p>

      </footer>

    </div>
  );
}

export default Chatbot;