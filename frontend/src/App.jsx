
import React, { useEffect, useState } from "react";
import "./App.css";

import Dashboard from "./Dashboard";
import Chatbot from "./chatbot";
import MoodTracker from "./MoodTracker";
import MoodAnalytics from "./MoodAnalytics";
import VoiceEmotion from "./VoiceEmotion";
import AIWellness from "./AIWellness";
import Settings from "./Settings";
import Profile from "./Profile";
import SafetySupport from "./SafetySupport";

import Login from "./Login";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

const defaultProfile = {
  name: "User",
  email: "user@example.com",
  photo: ""
};

function App() {

  // =========================================
  // LOGIN STATUS
  // =========================================

  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("mindcareLoggedIn") === "true"
  );

  // =========================================
  // CURRENT PAGE
  // =========================================

  const [page, setPage] = useState("dashboard");

  // =========================================
  // PROFILE DATA
  // =========================================

  const [profile, setProfile] = useState(() => {

    const savedProfile =
      localStorage.getItem("mindcareProfile");

    if (savedProfile) {

      try {

        const data = JSON.parse(savedProfile);

        return {
          name: data.name || "User",
          email: data.email || "user@example.com",
          photo: data.photo || ""
        };

      } catch (error) {

        console.error(
          "Error loading profile:",
          error
        );

      }
    }

    return defaultProfile;
  });

  // =========================================
  // DARK / LIGHT THEME
  // =========================================

  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem("mindcareTheme") === "dark"
  );

  // =========================================
  // APPLY THEME
  // =========================================

  useEffect(() => {

    document.body.classList.toggle(
      "dark-mode",
      darkMode
    );

    localStorage.setItem(
      "mindcareTheme",
      darkMode ? "dark" : "light"
    );

  }, [darkMode]);

  // =========================================
  // LOAD PROFILE
  // =========================================

  const loadProfile = () => {

    const savedProfile =
      localStorage.getItem("mindcareProfile");

    if (!savedProfile) {

      setProfile(defaultProfile);
      return;

    }

    try {

      const data = JSON.parse(savedProfile);

      setProfile({
        name: data.name || "User",
        email: data.email || "user@example.com",
        photo: data.photo || ""
      });

    } catch (error) {

      console.error(
        "Error loading profile:",
        error
      );

    }
  };

  // =========================================
  // PROFILE UPDATE LISTENER
  // =========================================

  useEffect(() => {

    loadProfile();

    const handleProfileUpdate = (event) => {

      if (event.detail) {

        setProfile({
          name: event.detail.name || "User",
          email:
            event.detail.email ||
            "user@example.com",
          photo: event.detail.photo || ""
        });

      } else {

        loadProfile();

      }
    };

    window.addEventListener(
      "mindcareProfileUpdated",
      handleProfileUpdate
    );

    window.addEventListener(
      "storage",
      loadProfile
    );

    return () => {

      window.removeEventListener(
        "mindcareProfileUpdated",
        handleProfileUpdate
      );

      window.removeEventListener(
        "storage",
        loadProfile
      );

    };

  }, []);

  // =========================================
  // LOGIN
  // =========================================

  const handleLogin = (user) => {

    localStorage.setItem(
      "mindcareLoggedIn",
      "true"
    );

    if (user) {

      const existingProfile =
        localStorage.getItem(
          "mindcareProfile"
        );

      let oldProfile = {};

      if (existingProfile) {

        try {

          oldProfile =
            JSON.parse(existingProfile);

        } catch {

          oldProfile = {};

        }
      }

      const updatedProfile = {

        name:
          user.displayName ||
          oldProfile.name ||
          "User",

        email:
          user.email ||
          oldProfile.email ||
          "user@example.com",

        photo:
          user.photoURL ||
          oldProfile.photo ||
          ""

      };

      localStorage.setItem(
        "mindcareProfile",
        JSON.stringify(updatedProfile)
      );

      setProfile(updatedProfile);

      window.dispatchEvent(
        new CustomEvent(
          "mindcareProfileUpdated",
          {
            detail: updatedProfile
          }
        )
      );

    }

    setIsLoggedIn(true);
    setPage("dashboard");

  };

  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = async () => {

    try {

      await signOut(auth);

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

    localStorage.removeItem(
      "mindcareLoggedIn"
    );

    setIsLoggedIn(false);
    setPage("dashboard");

  };

  // =========================================
  // THEME TOGGLE
  // =========================================

  const toggleTheme = () => {

    setDarkMode(
      (previousMode) => !previousMode
    );

  };

  // =========================================
  // SIDEBAR BUTTON
  // =========================================

  const SideButton = ({
    icon,
    text,
    pageName
  }) => {

    return (

      <button
        type="button"
        className={
          page === pageName
            ? "side-button active"
            : "side-button"
        }
        onClick={() =>
          setPage(pageName)
        }
      >

        <span className="side-button-icon">
          {icon}
        </span>

        <span>
          {text}
        </span>

      </button>

    );

  };

  // =========================================
  // GET PROFILE INITIAL
  // =========================================

  const getProfileInitial = () => {

    if (
      !profile.name ||
      !profile.name.trim()
    ) {

      return "U";

    }

    return profile.name
      .trim()
      .charAt(0)
      .toUpperCase();

  };

  // =========================================
  // SHOW LOGIN PAGE
  // =========================================

  if (!isLoggedIn) {

    return (
      <Login
        onLogin={handleLogin}
      />
    );

  }

  // =========================================
  // MAIN APPLICATION
  // =========================================

  return (

    <div
      className={
        darkMode
          ? "dashboard dark-mode"
          : "dashboard"
      }
    >

      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside className="sidebar">

        {/* =====================================
            LOGO
        ===================================== */}

        <div className="sidebar-logo">
          🧠
        </div>

        <h1>
          MindCare AI
        </h1>

        <p className="sidebar-subtitle">
          Wellness Companion
        </p>

        {/* =====================================
            PROFILE
        ===================================== */}

        <button
          type="button"
          className={
            page === "profile"
              ? "sidebar-profile active"
              : "sidebar-profile"
          }
          onClick={() =>
            setPage("profile")
          }
        >

          {/* PROFILE CIRCLE */}

          <div className="sidebar-profile-avatar">

            {profile.photo ? (

              <img
                src={profile.photo}
                alt="Profile"
              />

            ) : (

              <span>
                {getProfileInitial()}
              </span>

            )}

          </div>

          {/* PROFILE INFORMATION */}

          <div className="sidebar-profile-text">

            <strong>
              {profile.name ||
                "Your Profile"}
            </strong>

            <small>
              My Profile
            </small>

          </div>

          {/* ARROW */}

          <span className="sidebar-profile-arrow">
            ›
          </span>

        </button>

        {/* =====================================
            SCROLLABLE SIDEBAR AREA
            MENU + SETTINGS
        ===================================== */}

        <div className="sidebar-scroll-area">

          {/* =====================================
              MENU
          ===================================== */}

          <div className="sidebar-menu">

            <SideButton
              icon="🏠"
              text="Dashboard"
              pageName="dashboard"
            />

            <SideButton
              icon="💬"
              text="Chat AI"
              pageName="chat"
            />

            <SideButton
              icon="📊"
              text="Mood Tracker"
              pageName="mood"
            />

            <SideButton
              icon="📈"
              text="Mood Analytics"
              pageName="analytics"
            />

            <SideButton
              icon="🎤"
              text="Voice Emotion"
              pageName="voice"
            />

            <SideButton
              icon="🤖"
              text="AI Wellness"
              pageName="wellness"
            />

            {/* SAFETY SUPPORT */}

            <SideButton
              icon="🛡️"
              text="Safety Support"
              pageName="safety"
            />

          </div>

          {/* =====================================
              SETTINGS
              NOW INSIDE SCROLL AREA
          ===================================== */}

          <div className="sidebar-settings">

            <button
              type="button"
              className={
                page === "settings"
                  ? "side-button settings-button active"
                  : "side-button settings-button"
              }
              onClick={() =>
                setPage("settings")
              }
            >

              <span className="side-button-icon">
                ⚙️
              </span>

              <span>
                Settings
              </span>

            </button>

          </div>

        </div>

        {/* =====================================
            SIDEBAR BOTTOM
            STAYS AT BOTTOM
        ===================================== */}

        <div className="sidebar-bottom">

          <p>
            💙 Take care of your mind,
            <br />
            one day at a time.
          </p>

        </div>

      </aside>

      {/* =====================================
          MAIN CONTENT
      ===================================== */}

      <main className="dashboard-content">

        {page === "dashboard" && (
          <Dashboard />
        )}

        {page === "profile" && (
          <Profile />
        )}

        {page === "chat" && (
          <Chatbot />
        )}

        {page === "mood" && (
          <MoodTracker />
        )}

        {page === "analytics" && (
          <MoodAnalytics />
        )}

        {page === "voice" && (
          <VoiceEmotion />
        )}

        {page === "wellness" && (
          <AIWellness />
        )}

        {/* SAFETY SUPPORT */}

        {page === "safety" && (
          <SafetySupport
            onBackToChat={() =>
              setPage("chat")
            }
          />
        )}

        {page === "settings" && (
          <Settings
            darkMode={darkMode}
            toggleTheme={toggleTheme}
            onLogout={handleLogout}
          />
        )}

      </main>

    </div>

  );
}

export default App;

