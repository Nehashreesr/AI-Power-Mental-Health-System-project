import React, { useEffect, useState } from "react";
import "./Profile.css";
import { auth } from "./firebase";
import {
  signOut,
  onAuthStateChanged
} from "firebase/auth";

const API_URL = "http://127.0.0.1:5000";

const defaultProfile = {
  name: "User",
  email: "user@example.com",
  photo: ""
};

function Profile() {
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] =
    useState(defaultProfile);

  const [formData, setFormData] =
    useState(defaultProfile);

  const [message, setMessage] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  // =========================================
  // SYNCHRONIZE PROFILE
  // =========================================

  const synchronizeProfile = (updatedProfile) => {
    setProfile(updatedProfile);
    setFormData(updatedProfile);

    localStorage.setItem(
      "mindcareProfile",
      JSON.stringify(updatedProfile)
    );

    window.dispatchEvent(
      new CustomEvent(
        "mindcareProfileUpdated",
        {
          detail: updatedProfile
        }
      )
    );
  };

  // =========================================
  // LOAD PROFILE
  // =========================================

  useEffect(() => {

    // Load cached profile immediately
    const savedProfile =
      localStorage.getItem(
        "mindcareProfile"
      );

    if (savedProfile) {
      try {
        const parsedProfile =
          JSON.parse(savedProfile);

        setProfile(parsedProfile);
        setFormData(parsedProfile);

      } catch (error) {
        console.error(
          "Invalid saved profile:",
          error
        );
      }
    }

    // Get Firebase user
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {

          if (!user) {
            return;
          }

          try {

            const response =
              await fetch(
                `${API_URL}/users/${user.uid}`
              );

            const data =
              await response.json();

            console.log(
              "PROFILE DATABASE RESPONSE:",
              data
            );

            if (
              response.ok &&
              data.success
            ) {

              /*
               Only use a photo that was
               uploaded to MindCare.

               Firebase Google photo is ignored.
              */

              const databasePhoto =
                data.photo_url || "";

              const uploadedPhoto =
                databasePhoto.startsWith(
                  "data:image/"
                )
                  ? databasePhoto
                  : "";

              const loadedProfile = {
                name:
                  data.name ||
                  user.displayName ||
                  "User",

                email:
                  data.email ||
                  user.email ||
                  "user@example.com",

                photo:
                  uploadedPhoto
              };

              synchronizeProfile(
                loadedProfile
              );

            } else {

              const firebaseProfile = {
                name:
                  user.displayName ||
                  "User",

                email:
                  user.email ||
                  "user@example.com",

                photo: ""
              };

              synchronizeProfile(
                firebaseProfile
              );
            }

          } catch (error) {

            console.error(
              "Error loading profile:",
              error
            );

            /*
             Do not block the page if
             PostgreSQL is temporarily slow.
            */

            const fallbackProfile = {
              name:
                user.displayName ||
                "User",

              email:
                user.email ||
                "user@example.com",

              photo: ""
            };

            synchronizeProfile(
              fallbackProfile
            );
          }
        }
      );

    return () => unsubscribe();

  }, []);

  // =========================================
  // HANDLE TEXT INPUT
  // =========================================

  const handleChange = (event) => {

    const {
      name,
      value
    } = event.target;

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value
      })
    );
  };

  // =========================================
  // HANDLE PHOTO
  // =========================================

  const handlePhotoChange = (event) => {

    const file =
      event.target.files[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {

      setMessage(
        "Please select an image file."
      );

      return;
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {

      setMessage(
        "Please choose an image smaller than 2 MB."
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {

      setFormData(
        (previous) => ({
          ...previous,
          photo: reader.result
        })
      );

      setMessage("");
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  // =========================================
  // SAVE PROFILE
  // =========================================

  const handleSave = async () => {

    const user =
      auth.currentUser;

    if (!user) {

      setMessage(
        "Please log in first."
      );

      return;
    }

    const name =
      formData.name.trim();

    const email =
      formData.email.trim();

    if (!name) {

      setMessage(
        "Please enter your name."
      );

      return;
    }

    if (!email) {

      setMessage(
        "Please enter your email."
      );

      return;
    }

    // =========================================
    // CREATE UPDATED PROFILE
    // =========================================

    const updatedProfile = {
      name: name,
      email: email,
      photo: formData.photo || ""
    };

    // =========================================
    // UPDATE UI IMMEDIATELY
    // =========================================

    setProfile(updatedProfile);
    setFormData(updatedProfile);

    // =========================================
    // UPDATE SIDEBAR IMMEDIATELY
    // =========================================

    localStorage.setItem(
      "mindcareProfile",
      JSON.stringify(updatedProfile)
    );

    window.dispatchEvent(
      new CustomEvent(
        "mindcareProfileUpdated",
        {
          detail: updatedProfile
        }
      )
    );

    // =========================================
    // CLOSE EDIT MODE IMMEDIATELY
    // =========================================

    setIsEditing(false);

    // =========================================
    // SHOW SUCCESS IMMEDIATELY
    // =========================================

    setMessage(
      "Profile saved successfully 💙"
    );

    // =========================================
    // SAVE TO DATABASE IN BACKGROUND
    // =========================================

    setSaving(true);

    try {

      const response =
        await fetch(
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
                name,

              email:
                email,

              photo_url:
                formData.photo || ""
            })
          }
        );

      const data =
        await response.json();

      console.log(
        "PROFILE SAVE RESPONSE:",
        data
      );

      if (!response.ok) {

        throw new Error(
          data.error ||
          "Failed to save profile"
        );
      }

      console.log(
        "Profile saved to PostgreSQL successfully"
      );

    } catch (error) {

      console.error(
        "Background profile save error:",
        error
      );

      /*
       The UI has already changed.
       Only database saving failed.
      */

      setMessage(
        "Profile updated, but database save failed."
      );

    } finally {

      setSaving(false);
    }
  };

  // =========================================
  // CANCEL EDITING
  // =========================================

  const handleCancel = () => {

    setFormData(profile);

    setIsEditing(false);

    setMessage("");
  };

  // =========================================
  // REMOVE PHOTO
  // =========================================

  const removePhoto = () => {

    const updatedProfile = {
      ...formData,
      photo: ""
    };

    setFormData(updatedProfile);

    setProfile(updatedProfile);

    localStorage.setItem(
      "mindcareProfile",
      JSON.stringify(updatedProfile)
    );

    window.dispatchEvent(
      new CustomEvent(
        "mindcareProfileUpdated",
        {
          detail: updatedProfile
        }
      )
    );
  };

  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = async () => {

    const confirmLogout =
      window.confirm(
        "Are you sure you want to logout?"
      );

    if (!confirmLogout) {
      return;
    }

    try {

      await signOut(auth);

      localStorage.removeItem(
        "mindcareLoggedIn"
      );

      localStorage.removeItem(
        "mindcareProfile"
      );

      window.location.href = "/";

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

      setMessage(
        "Unable to logout. Please try again."
      );
    }
  };

  // =========================================
  // GET LETTER FROM GMAIL
  // =========================================

  const getInitial = () => {

    const email =
      formData.email ||
      profile.email ||
      auth.currentUser?.email ||
      "";

    const cleanEmail =
      email.trim();

    if (!cleanEmail) {
      return "U";
    }

    const emailName =
      cleanEmail.split("@")[0];

    if (!emailName) {
      return "U";
    }

    return emailName
      .charAt(0)
      .toUpperCase();
  };

  // =========================================
  // UI
  // =========================================

  return (
    <div className="profile-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="profile-header">

        <div>

          <h1>
            My Profile
          </h1>

          <p>
            Manage your personal
            information and account
            details.
          </p>

        </div>

        {!isEditing && (
          <button
            className="edit-profile-btn"
            onClick={() =>
              setIsEditing(true)
            }
          >
            ✏️ Edit Profile
          </button>
        )}

      </div>

      {/* =====================================
          MESSAGE
      ===================================== */}

      {message && (
        <p
          className="mood-message"
          style={{
            textAlign: "center",
            margin: "10px 0"
          }}
        >
          {message}
        </p>
      )}

      {/* =====================================
          PROFILE CARD
      ===================================== */}

      <div className="profile-card">

        {/* ===================================
            PROFILE PHOTO
        =================================== */}

        <div className="profile-photo-section">

          <div className="profile-photo">

            {formData.photo ? (

              <img
                src={formData.photo}
                alt="Profile"
              />

            ) : (

              <span className="profile-initial">
                {getInitial()}
              </span>

            )}

          </div>

          {/* PHOTO ACTIONS */}

          {isEditing && (
            <div className="photo-actions">

              <label
                htmlFor="profile-photo"
                className="upload-photo-btn"
              >
                📷 Change Photo
              </label>

              <input
                id="profile-photo"
                type="file"
                accept="image/*"
                onChange={
                  handlePhotoChange
                }
                hidden
              />

              {formData.photo && (
                <button
                  type="button"
                  className="remove-photo-btn"
                  onClick={
                    removePhoto
                  }
                >
                  Remove
                </button>
              )}

            </div>
          )}

          {!isEditing && (
            <p className="photo-help">
              Profile picture
            </p>
          )}

        </div>

        {/* ===================================
            PROFILE INFORMATION
        =================================== */}

        <div className="profile-information">

          {/* FULL NAME */}

          <div className="form-group">

            <label>
              Full Name
            </label>

            {isEditing ? (

              <input
                type="text"
                name="name"
                value={
                  formData.name
                }
                onChange={
                  handleChange
                }
                placeholder="Enter your name"
              />

            ) : (

              <div className="profile-value">
                {profile.name}
              </div>

            )}

          </div>

          {/* EMAIL */}

          <div className="form-group">

            <label>
              Email Address
            </label>

            {isEditing ? (

              <input
                type="email"
                name="email"
                value={
                  formData.email
                }
                onChange={
                  handleChange
                }
                placeholder="Enter your email"
              />

            ) : (

              <div className="profile-value">
                {profile.email}
              </div>

            )}

          </div>

          {/* ACCOUNT TYPE */}

          <div className="form-group">

            <label>
              Account Type
            </label>

            <div className="profile-value account-type">

              <span>
                🌿
              </span>

              MindCare Wellness User

            </div>

          </div>

          {/* SAVE / CANCEL */}

          {isEditing && (
            <div className="profile-buttons">

              <button
                type="button"
                className="save-profile-btn"
                onClick={
                  handleSave
                }
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "✓ Save Changes"}
              </button>

              <button
                type="button"
                className="cancel-profile-btn"
                onClick={
                  handleCancel
                }
                disabled={saving}
              >
                Cancel
              </button>

            </div>
          )}

        </div>

      </div>

      {/* =====================================
          PRIVACY CARD
      ===================================== */}

      <div className="privacy-card">

        <div className="privacy-icon">
          🔒
        </div>

        <div>

          <h3>
            Your Privacy Matters
          </h3>

          <p>
            Your profile information
            is associated with your
            secure account and stored
            in the MindCare database.
            MindCare AI is designed
            to provide general wellness
            support and is not a
            substitute for professional
            medical care.
          </p>

        </div>

      </div>

      {/* =====================================
          LOGOUT
      ===================================== */}

      <div className="logout-section">

        <button
          type="button"
          className="logout-btn"
          onClick={
            handleLogout
          }
        >
          🚪 Logout
        </button>

      </div>

    </div>
  );
}

export default Profile;