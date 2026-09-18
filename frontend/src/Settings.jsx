
import React, { useEffect, useState } from "react";
import "./App.css";
import { auth } from "./firebase";

const API_URL = "http://127.0.0.1:5000";

const defaultProfile = {
  name: "User",
  email: "user@example.com",
  photo: ""
};

function Settings() {
  // =========================================
  // PROFILE
  // =========================================

  const [profile, setProfile] = useState(defaultProfile);

  const [editing, setEditing] = useState(false);

  const [tempName, setTempName] = useState("");

  const [tempPhoto, setTempPhoto] = useState("");

  const [profileMessage, setProfileMessage] =
    useState("");

  const [loadingProfile, setLoadingProfile] =
    useState(true);

  const [savingProfile, setSavingProfile] =
    useState(false);


  // =========================================
  // LOAD PROFILE FROM POSTGRESQL
  // =========================================

  const loadProfile = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        setLoadingProfile(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/users/${user.uid}`
      );

      const data = await response.json();

      if (
        response.ok &&
        data.success &&
        data.user
      ) {
        const updatedProfile = {
          name:
            data.user.name ||
            user.displayName ||
            "User",

          email:
            data.user.email ||
            user.email ||
            "user@example.com",

          photo:
            data.user.photo_url ||
            user.photoURL ||
            ""
        };

        setProfile(updatedProfile);
        setTempName(updatedProfile.name);
        setTempPhoto(updatedProfile.photo);

        // UI fallback only
        localStorage.setItem(
          "mindcareProfile",
          JSON.stringify(updatedProfile)
        );
      } else {
        // Firebase fallback
        const firebaseProfile = {
          name:
            user.displayName ||
            "User",

          email:
            user.email ||
            "user@example.com",

          photo:
            user.photoURL ||
            ""
        };

        setProfile(firebaseProfile);
        setTempName(firebaseProfile.name);
        setTempPhoto(firebaseProfile.photo);
      }
    } catch (error) {
      console.error(
        "PROFILE LOAD ERROR:",
        error
      );

      // Firebase fallback
      const user = auth.currentUser;

      if (user) {
        const firebaseProfile = {
          name:
            user.displayName ||
            "User",

          email:
            user.email ||
            "user@example.com",

          photo:
            user.photoURL ||
            ""
        };

        setProfile(firebaseProfile);
        setTempName(firebaseProfile.name);
        setTempPhoto(firebaseProfile.photo);
      }
    } finally {
      setLoadingProfile(false);
    }
  };


  // =========================================
  // INITIAL PROFILE LOAD
  // =========================================

  useEffect(() => {
    loadProfile();

    const handleProfileUpdate = (event) => {
      if (event.detail) {
        const updatedProfile = {
          name:
            event.detail.name ||
            "User",

          email:
            event.detail.email ||
            "user@example.com",

          photo:
            event.detail.photo ||
            ""
        };

        setProfile(updatedProfile);

        if (!editing) {
          setTempName(
            updatedProfile.name
          );

          setTempPhoto(
            updatedProfile.photo
          );
        }
      } else {
        loadProfile();
      }
    };

    window.addEventListener(
      "mindcareProfileUpdated",
      handleProfileUpdate
    );

    return () => {
      window.removeEventListener(
        "mindcareProfileUpdated",
        handleProfileUpdate
      );
    };
  }, [editing]);


  // =========================================
  // PROFILE PHOTO
  // =========================================

  const handlePhotoChange = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileMessage(
        "Please select an image file."
      );

      event.target.value = "";
      return;
    }

    // Maximum 2 MB
    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage(
        "Please select an image smaller than 2 MB."
      );

      event.target.value = "";
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      setTempPhoto(
        reader.result
      );

      setProfileMessage("");
    };

    reader.onerror = () => {
      setProfileMessage(
        "Unable to load the selected image."
      );
    };

    reader.readAsDataURL(file);

    // Allow same image to be selected again
    event.target.value = "";
  };


  // =========================================
  // REMOVE PROFILE PHOTO
  // =========================================

  const removeProfilePhoto = () => {
    setTempPhoto("");
    setProfileMessage("");
  };


  // =========================================
  // SAVE PROFILE TO POSTGRESQL
  // =========================================

  const saveProfile = async () => {
    const trimmedName =
      tempName.trim();

    if (!trimmedName) {
      setProfileMessage(
        "Please enter your name."
      );
      return;
    }

    const user =
      auth.currentUser;

    if (!user) {
      setProfileMessage(
        "Please log in again."
      );
      return;
    }

    setSavingProfile(true);
    setProfileMessage("");

    try {
      const updatedProfile = {
        name: trimmedName,

        email:
          user.email ||
          profile.email ||
          "user@example.com",

        photo:
          tempPhoto ||
          ""
      };

      // =====================================
      // SAVE TO POSTGRESQL
      // =====================================

      const response = await fetch(
        `${API_URL}/users`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            firebase_uid:
              user.uid,

            name:
              updatedProfile.name,

            email:
              updatedProfile.email,

            photo_url:
              updatedProfile.photo
          })
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
          "Unable to save profile."
        );
      }

      // =====================================
      // UPDATE STATE
      // =====================================

      setProfile(
        updatedProfile
      );

      setTempName(
        updatedProfile.name
      );

      setTempPhoto(
        updatedProfile.photo
      );

      // =====================================
      // LOCAL UI FALLBACK
      // =====================================

      localStorage.setItem(
        "mindcareProfile",
        JSON.stringify(updatedProfile)
      );

      // =====================================
      // UPDATE SIDEBAR
      // =====================================

      window.dispatchEvent(
        new CustomEvent(
          "mindcareProfileUpdated",
          {
            detail:
              updatedProfile
          }
        )
      );

      setEditing(false);

      setProfileMessage(
        "Profile saved successfully."
      );

    } catch (error) {
      console.error(
        "PROFILE SAVE ERROR:",
        error
      );

      setProfileMessage(
        error.message ||
        "Unable to save profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };


  // =========================================
  // CANCEL EDITING
  // =========================================

  const cancelEditing = () => {
    setTempName(
      profile.name
    );

    setTempPhoto(
      profile.photo
    );

    setProfileMessage("");

    setEditing(false);
  };


  // =========================================
  // WELLNESS NOTIFICATIONS
  // =========================================

  const [notifications, setNotifications] =
    useState(
      localStorage.getItem(
        "mindcareNotifications"
      ) !== "false"
    );

  const [
    notificationPermission,
    setNotificationPermission
  ] = useState(
    typeof Notification !== "undefined"
      ? Notification.permission
      : "default"
  );


  // =========================================
  // CHANGE NOTIFICATIONS
  // =========================================

  const changeNotifications =
    async () => {
      const newValue =
        !notifications;

      if (newValue) {
        if (
          !("Notification" in window)
        ) {
          setNotifications(false);

          localStorage.setItem(
            "mindcareNotifications",
            "false"
          );

          return;
        }

        const permission =
          await Notification.requestPermission();

        setNotificationPermission(
          permission
        );

        if (
          permission !== "granted"
        ) {
          setNotifications(false);

          localStorage.setItem(
            "mindcareNotifications",
            "false"
          );

          return;
        }

        setNotifications(true);

        localStorage.setItem(
          "mindcareNotifications",
          "true"
        );

        new Notification(
          "🧠 MindCare AI",
          {
            body:
              "Daily wellness reminders are now enabled. 💙",

            icon:
              "/favicon.ico"
          }
        );
      } else {
        setNotifications(false);

        localStorage.setItem(
          "mindcareNotifications",
          "false"
        );
      }
    };


  // =========================================
  // DAILY WELLNESS REMINDER
  // =========================================

  useEffect(() => {
    if (!notifications) {
      return;
    }

    if (
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const checkDailyReminder = () => {
      const now =
        new Date();

      const today =
        `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`;

      const lastReminder =
        localStorage.getItem(
          "mindcareLastReminder"
        );

      if (
        lastReminder === today
      ) {
        return;
      }

      if (
        now.getHours() >= 18
      ) {
        new Notification(
          "🧠 MindCare AI",
          {
            body:
              "How are you feeling today? Take a moment for your daily mood check-in. 💙",

            icon:
              "/favicon.ico"
          }
        );

        localStorage.setItem(
          "mindcareLastReminder",
          today
        );
      }
    };

    checkDailyReminder();

    const reminderInterval =
      setInterval(
        checkDailyReminder,
        60 * 1000
      );

    return () => {
      clearInterval(
        reminderInterval
      );
    };
  }, [notifications]);


  // =========================================
  // PRIVACY MODAL
  // =========================================

  const [
    showPrivacy,
    setShowPrivacy
  ] = useState(false);


  // =========================================
  // OPEN EDIT
  // =========================================

  const openEdit = () => {
    setTempName(
      profile.name
    );

    setTempPhoto(
      profile.photo
    );

    setProfileMessage("");

    setEditing(true);
  };


  // =========================================
  // UI
  // =========================================

  return (
    <div className="settings-screen">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="settings-top">

        <div>
          <h1>
            Settings
          </h1>

          <p>
            Manage your MindCare AI preferences.
          </p>
        </div>

        <span className="settings-search">
          ⌕
        </span>

      </div>


      {/* =====================================
          ACCOUNT
      ===================================== */}

      <section className="settings-section">

        <h2>
          Account
        </h2>

        <div className="settings-row">

          <div className="profile-info">

            <div className="profile-photo">

              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt="Profile"
                />
              ) : (
                <span>
                  👤
                </span>
              )}

            </div>


            <div>

              <p className="settings-title">
                Profile
              </p>

              <p className="settings-description">

                {loadingProfile
                  ? "Loading profile..."
                  : `Welcome, ${profile.name}`}

              </p>

            </div>

          </div>


          <button
            className="settings-outline-btn"
            onClick={openEdit}
          >
            Edit
          </button>

        </div>


        {/* =====================================
            PROFILE EDITOR
        ===================================== */}

        {editing && (

          <div className="profile-editor">

            <h3 className="profile-editor-title">
              Edit Profile
            </h3>


            {/* PROFILE PHOTO */}

            <div className="profile-edit-photo">

              {tempPhoto ? (
                <img
                  src={tempPhoto}
                  alt="Profile preview"
                />
              ) : (
                <span>
                  👤
                </span>
              )}

            </div>


            {/* PHOTO BUTTONS */}

            <div className="photo-buttons">

              <label className="photo-upload-btn">

                📷 Choose Profile Photo

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handlePhotoChange
                  }
                />

              </label>


              {tempPhoto && (

                <button
                  type="button"
                  className="remove-photo-btn"
                  onClick={
                    removeProfilePhoto
                  }
                >
                  Remove Photo
                </button>

              )}

            </div>


            {/* NAME */}

            <label>
              Your Name
            </label>

            <input
              type="text"
              placeholder="Enter your name"
              value={tempName}
              onChange={(e) =>
                setTempName(
                  e.target.value
                )
              }
            />


            {/* EMAIL */}

            <label>
              Email
            </label>

            <input
              type="email"
              value={
                profile.email ||
                "user@example.com"
              }
              disabled
              readOnly
            />


            {/* MESSAGE */}

            {profileMessage && (

              <p className="profile-message">
                {profileMessage}
              </p>

            )}


            {/* ACTION BUTTONS */}

            <div className="profile-actions">

              <button
                className="settings-save-btn"
                onClick={
                  saveProfile
                }
                disabled={
                  savingProfile
                }
              >

                {savingProfile
                  ? "Saving..."
                  : "Save Profile"}

              </button>


              <button
                className="settings-cancel-btn"
                onClick={
                  cancelEditing
                }
                disabled={
                  savingProfile
                }
              >
                Cancel
              </button>

            </div>

          </div>

        )}

      </section>


      {/* =====================================
          WELLNESS
      ===================================== */}

      <section className="settings-section">

        <h2>
          Wellness
        </h2>

        <div className="settings-row">

          <div>

            <p className="settings-title">
              Daily wellness reminders
            </p>

            <p className="settings-description">

              {notifications
                ? "Wellness notifications are enabled"
                : "Wellness notifications are disabled"}

            </p>


            {notifications &&
              notificationPermission ===
                "granted" && (

                <p className="notification-ready">
                  ✓ Daily reminder is active
                </p>

              )}


            {notificationPermission ===
              "denied" && (

              <p className="notification-blocked">
                Notifications are blocked in your
                browser. Please allow notifications
                in browser settings.
              </p>

            )}

          </div>


          <label className="settings-switch">

            <input
              type="checkbox"
              checked={
                notifications
              }
              onChange={
                changeNotifications
              }
            />

            <span></span>

          </label>

        </div>

      </section>


      {/* =====================================
          PRIVACY
      ===================================== */}

      <section className="settings-section">

        <h2>
          Privacy
        </h2>


        <div className="settings-row">

          <div>

            <p className="settings-title">
              Mood data
            </p>

            <p className="settings-description">
              Your mood records are stored in
              the MindCare AI PostgreSQL database
              and linked to your account.
            </p>

          </div>


          <span className="settings-status">
            🔒 Protected
          </span>

        </div>


        <div className="settings-row">

          <div>

            <p className="settings-title">
              Privacy information
            </p>

            <p className="settings-description">
              Learn how MindCare AI handles your
              information
            </p>

          </div>


          <button
            className="settings-outline-btn"
            onClick={() =>
              setShowPrivacy(true)
            }
          >
            View
          </button>

        </div>

      </section>


      {/* =====================================
          ABOUT
      ===================================== */}

      <section className="settings-section">

        <h2>
          About
        </h2>


        <div className="settings-row">

          <div>

            <p className="settings-title">
              MindCare AI
            </p>

            <p className="settings-description">
              AI-powered wellness companion for
              mood tracking, emotional insights and
              general wellness support
            </p>

          </div>


          <span className="settings-version">
            Version 1.0.0
          </span>

        </div>

      </section>


      {/* =====================================
          PRIVACY MODAL
      ===================================== */}

      {showPrivacy && (

        <div
          className="privacy-overlay"
          onClick={() =>
            setShowPrivacy(false)
          }
        >

          <div
            className="privacy-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="privacy-header">

              <div className="privacy-header-icon">
                🔒
              </div>


              <div>

                <h2>
                  Privacy Information
                </h2>

                <p>
                  Your privacy and data protection
                </p>

              </div>


              <button
                className="privacy-close"
                onClick={() =>
                  setShowPrivacy(false)
                }
              >
                ×
              </button>

            </div>


            {/* BODY */}

            <div className="privacy-body">

              {/* MOOD DATA */}

              <div className="privacy-card">

                <div className="privacy-card-icon">
                  📊
                </div>

                <div>

                  <h3>
                    Mood Data
                  </h3>

                  <p>
                    Your mood records are stored in
                    the PostgreSQL database and linked
                    to your Firebase account ID so
                    different users have separate
                    records.
                  </p>

                </div>

              </div>


              {/* PROFILE */}

              <div className="privacy-card">

                <div className="privacy-card-icon">
                  👤
                </div>

                <div>

                  <h3>
                    Profile Information
                  </h3>

                  <p>
                    Your profile name, email and
                    profile photo are associated with
                    your Firebase account and stored
                    in the application database.
                  </p>

                </div>

              </div>


              {/* CHAT */}

              <div className="privacy-card">

                <div className="privacy-card-icon">
                  💬
                </div>

                <div>

                  <h3>
                    Chat History
                  </h3>

                  <p>
                    Chat messages are stored with
                    your Firebase user ID so your
                    conversations remain associated
                    with your account.
                  </p>

                </div>

              </div>


              {/* NOTIFICATIONS */}

              <div className="privacy-card">

                <div className="privacy-card-icon">
                  🔔
                </div>

                <div>

                  <h3>
                    Wellness Preferences
                  </h3>

                  <p>
                    Your browser notification
                    preference is stored locally on
                    your device because notification
                    permission is controlled by the
                    browser.
                  </p>

                </div>

              </div>


              {/* DATA PROTECTION */}

              <div className="privacy-card">

                <div className="privacy-card-icon">
                  🛡️
                </div>

                <div>

                  <h3>
                    Data Protection
                  </h3>

                  <p>
                    MindCare AI associates application
                    records with your Firebase user ID
                    to keep user information separated.
                  </p>

                </div>

              </div>


              {/* WELLNESS SUPPORT */}

              <div className="privacy-card">

                <div className="privacy-card-icon">
                  🧠
                </div>

                <div>

                  <h3>
                    Wellness Support
                  </h3>

                  <p>
                    MindCare AI provides general
                    wellness information and emotional
                    support. It is not a replacement
                    for professional mental health care.
                  </p>

                </div>

              </div>

            </div>


            {/* FOOTER */}

            <div className="privacy-footer">

              <span>
                🔐 Your privacy matters
              </span>


              <button
                className="privacy-close-btn"
                onClick={() =>
                  setShowPrivacy(false)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Settings;

