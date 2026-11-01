import React, {
  useEffect,
  useRef,
  useState
} from "react";

import "./App.css";

const API_URL =
  "http://127.0.0.1:5000";

const welcomeMessage = {
  role: "assistant",
  content:
    "Hi! I'm MindCare AI 💙 I'm here to listen and support your general wellness. How are you feeling today?"
};


/* =========================
   EMERGENCY SETTINGS
========================= */

// Time (milliseconds) the user can read the caring message
// before being taken to the Safety Support page.
// Set to 0 to go there instantly.
const EMERGENCY_REDIRECT_DELAY_MS = 1500;

// Checked in the browser BEFORE the message is sent, so the
// redirect is instant and works even if the backend is slow or
// not running. The backend (safety.py) checks again as well.
const EMERGENCY_WORDS = [
  "suicide",
  "suicidal",
  "kill myself",
  "killing myself",
  "kill me",
  "end my life",
  "end it all",
  "ending it all",
  "want to die",
  "wanna die",
  "wish i was dead",
  "wish i were dead",
  "better off dead",
  "better off without me",
  "feel like dying",
  "don't want to live",
  "do not want to live",
  "don't want to be alive",
  "no reason to live",
  "can't go on",
  "cannot go on",
  "can't take it anymore",
  "self harm",
  "self-harm",
  "hurt myself",
  "harm myself",
  "cut myself",
  "hang myself",
  "overdose",
  "emergency",
  "in danger"
];

const normalizeText = (text) =>
  text
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const looksLikeEmergency = (text) => {

  const lower =
    normalizeText(text);

  return EMERGENCY_WORDS.some(
    (word) => lower.includes(word)
  );
};

const emergencyFallbackMessage =
  "I'm really sorry you're feeling this way. You deserve support right now. I'm opening Safety Support so you can reach help quickly. Please contact a trusted person or your local emergency services.";


function Chatbot({ onEmergency }) {

  const [messages, setMessages] =
    useState([welcomeMessage]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [listening, setListening] =
    useState(false);


  const chatEndRef =
    useRef(null);

  const inputRef =
    useRef(null);

  const recognitionRef =
    useRef(null);

  const redirectTimerRef =
    useRef(null);


  /* =========================
     AUTO SCROLL
  ========================= */

  useEffect(() => {

    chatEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });

  }, [messages, loading]);


  /* =========================
     GO TO SAFETY SUPPORT
  ========================= */

  const goToSafetySupport = () => {

    console.log(
      "MindCare: emergency detected. onEmergency connected:",
      typeof onEmergency === "function"
    );

    // Stop speech if currently playing
    if (
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    // Stop voice recognition
    if (
      recognitionRef.current
    ) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log(
          "Recognition already stopped."
        );
      }
    }

    if (!onEmergency) {

      console.warn(
        "Chatbot: onEmergency is missing. In App.jsx use " +
        "<Chatbot onEmergency={() => setPage(\"safety\")} />"
      );

      return;
    }

    if (redirectTimerRef.current) {
      clearTimeout(
        redirectTimerRef.current
      );
    }

    redirectTimerRef.current =
      setTimeout(() => {

        onEmergency();

      }, EMERGENCY_REDIRECT_DELAY_MS);
  };


  /* =========================
     SEND MESSAGE
  ========================= */

  const sendMessage =
    async (customMessage = null) => {

      const text =
        (customMessage ?? input).trim();

      if (!text || loading) {
        return;
      }


      // -----------------------------------------
      // SAVE CURRENT CHAT HISTORY
      // -----------------------------------------

      const chatHistory =
        messages.slice(-6);


      // -----------------------------------------
      // CREATE USER MESSAGE
      // -----------------------------------------

      const userMessage = {
        role: "user",
        content: text
      };


      // -----------------------------------------
      // UPDATE UI IMMEDIATELY
      // -----------------------------------------

      setMessages((previous) => [
        ...previous,
        userMessage
      ]);

      setInput("");


      // -----------------------------------------
      // EMERGENCY: GO STRAIGHT TO SAFETY SUPPORT
      // -----------------------------------------

      if (looksLikeEmergency(text)) {

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content:
              emergencyFallbackMessage,
            type: "safety"
          }
        ]);

        goToSafetySupport();

        return;
      }


      setLoading(true);


      // -----------------------------------------
      // KEEP INPUT READY
      // -----------------------------------------

      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);


      try {

        const response =
          await fetch(
            `${API_URL}/chat`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                message: text,
                history: chatHistory
              })
            }
          );


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success &&
          !data.reply
        ) {

          throw new Error(
            data.error ||
            "Backend error"
          );
        }


        // -----------------------------------------
        // SHOW AI RESPONSE
        // -----------------------------------------

        const assistantMessage = {
          role: "assistant",
          content:
            data.reply ||
            "I'm here to listen.",
          type:
            data.type || "ai"
        };


        setMessages((previous) => [
          ...previous,
          assistantMessage
        ]);


        // -----------------------------------------
        // EMERGENCY: GO TO SAFETY SUPPORT
        // -----------------------------------------

        if (data.type === "safety") {

          goToSafetySupport();
        }

      } catch (error) {

        console.error(
          "Chat error:",
          error
        );


        setMessages((previous) => [
          ...previous,
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
        }, 0);
      }
    };


  /* =========================
     ENTER KEY
  ========================= */

  const handleKeyDown =
    (event) => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();
      }
    };


  /* =========================
     CLEAR CHAT
  ========================= */

  const clearChat = () => {

    // Stop speech if currently playing
    if (
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }


    // Stop voice recognition
    if (
      recognitionRef.current
    ) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log(
          "Recognition already stopped."
        );
      }
    }


    setMessages([
      welcomeMessage
    ]);

    setInput("");

    setListening(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };


  /* =========================
     TEXT TO SPEECH
  ========================= */

  const speakMessage =
    (text) => {

      if (
        !("speechSynthesis" in window)
      ) {

        alert(
          "Text-to-speech is not supported in this browser."
        );

        return;
      }


      // Stop previous speech
      window.speechSynthesis.cancel();


      const speech =
        new SpeechSynthesisUtterance(
          text
        );


      speech.rate =
        0.95;

      speech.pitch =
        1;


      window.speechSynthesis.speak(
        speech
      );
    };


  /* =========================
     VOICE INPUT
  ========================= */

  const startVoiceInput =
    () => {

      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


      if (!SpeechRecognition) {

        alert(
          "Voice input is not supported. Try Google Chrome or Microsoft Edge."
        );

        return;
      }


      // -----------------------------------------
      // STOP CURRENT LISTENING
      // -----------------------------------------

      if (
        listening &&
        recognitionRef.current
      ) {

        recognitionRef.current.stop();

        return;
      }


      const recognition =
        new SpeechRecognition();


      recognition.lang =
        "en-US";

      recognition.continuous =
        false;

      recognition.interimResults =
        false;


      // -----------------------------------------
      // START
      // -----------------------------------------

      recognition.onstart =
        () => {

          setListening(true);
        };


      // -----------------------------------------
      // RESULT
      // -----------------------------------------

      recognition.onresult =
        (event) => {

          const transcript =
            event.results[0][0]
              .transcript;


          setInput((previous) =>
            previous
              ? `${previous} ${transcript}`
              : transcript
          );
        };


      // -----------------------------------------
      // ERROR
      // -----------------------------------------

      recognition.onerror =
        (event) => {

          console.error(
            "Voice error:",
            event.error
          );

          setListening(false);
        };


      // -----------------------------------------
      // END
      // -----------------------------------------

      recognition.onend =
        () => {

          setListening(false);

          recognitionRef.current =
            null;
        };


      recognitionRef.current =
        recognition;


      recognition.start();
    };


  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {

    return () => {

      // Cancel a pending emergency redirect timer
      if (redirectTimerRef.current) {

        clearTimeout(
          redirectTimerRef.current
        );
      }


      // Stop speech
      if (
        "speechSynthesis" in window
      ) {

        window.speechSynthesis.cancel();
      }


      // Stop recognition
      if (
        recognitionRef.current
      ) {

        try {

          recognitionRef.current.stop();

        } catch (error) {

          console.log(
            "Recognition cleanup completed."
          );
        }
      }
    };

  }, []);


  /* =========================
     QUICK PROMPTS
  ========================= */

  const quickPrompts = [
    "I feel sad today",
    "I'm feeling stressed",
    "I feel lonely",
    "I need some motivation"
  ];


  /* =========================
     UI
  ========================= */

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

            <h2>
              MindCare AI
            </h2>

            <p>
              Wellness Companion
            </p>

          </div>

        </div>


        <div className="chat-header-actions">

          <button
            className="clear-button"
            onClick={clearChat}
            disabled={loading}
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

        {quickPrompts.map(
          (prompt) => (

            <button
              key={prompt}
              onClick={() =>
                sendMessage(prompt)
              }
              disabled={loading}
            >
              {prompt}
            </button>

          )
        )}

      </div>


      {/* =========================
          CHAT AREA
      ========================= */}

      <section className="chat-container">

        <div className="messages">

          {messages.map(
            (message, index) => (

              <div
                key={index}
                className={
                  message.role === "user"
                    ? "message user"
                    : "message assistant"
                }
              >

                {message.role ===
                  "assistant" && (

                  <div className="bot-avatar">
                    🧠
                  </div>

                )}


                <div className="message-content">

                  <div
                    className={
                      message.type ===
                      "error"
                        ? "bubble error-bubble"
                        : "bubble"
                    }
                  >

                    {message.content}

                  </div>


                  {/* LISTEN BUTTON */}

                  {message.role ===
                    "assistant" &&
                    message.type !==
                      "error" && (

                    <button
                      className="speak-button"
                      onClick={() =>
                        speakMessage(
                          message.content
                        )
                      }
                    >
                      🔊 Listen
                    </button>

                  )}


                  {/* SAFETY SUPPORT BUTTON */}

                  {message.type ===
                    "safety" &&
                    onEmergency && (

                    <button
                      className="speak-button"
                      onClick={() => {

                        if (
                          redirectTimerRef.current
                        ) {
                          clearTimeout(
                            redirectTimerRef.current
                          );
                        }

                        onEmergency();
                      }}
                    >
                      🆘 Open Safety Support
                    </button>

                  )}


                  {message.type ===
                    "safety" &&
                    !onEmergency && (

                    <small
                      style={{
                        color: "#ef4444",
                        display: "block",
                        marginTop: "6px"
                      }}
                    >
                      ⚠️ Safety Support is not connected yet. In
                      App.jsx change &lt;Chatbot /&gt; to
                      &lt;Chatbot onEmergency=
                      {"{() => setPage(\"safety\")}"} /&gt;
                    </small>

                  )}

                </div>

              </div>

            )
          )}


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


          <div
            ref={chatEndRef}
          />

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
            onClick={
              startVoiceInput
            }
            disabled={loading}
            title="Voice input"
          >
            🎤
          </button>


          {/* TEXT */}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) =>
              setInput(
                event.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
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
            onClick={() =>
              sendMessage()
            }
            disabled={
              loading ||
              !input.trim()
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
