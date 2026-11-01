
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

  const [profile, setProfile] = useState(defaultProfile);

  const [formData, setFormData] = useState(defaultProfile);

  const [message, setMessage] = useState("");

  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);


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
      new CustomEvent("mindcareProfileUpdated", {
        detail: updatedProfile
      })
    );
  };


  // =========================================
  // LOAD PROFILE FROM DATABASE
  // =========================================

  useEffect(() => {

    const savedProfile =
      localStorage.getItem("mindcareProfile");

    if (savedProfile) {

      try {

        const parsedProfile = JSON.parse(savedProfile);

        setProfile(parsedProfile);
        setFormData(parsedProfile);

      } catch (error) {

        console.error("Invalid saved profile:", error);

      }
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {

        if (!user) {

          setLoading(false);
          return;
        }

        try {

          setLoading(true);

          const response = await fetch(
            `${API_URL}/users/${user.uid}`
          );

          if (!response.ok) {
            throw new Error("Unable to load profile from database.");
          }

          const data = await response.json();

          console.log("DATABASE PROFILE:", data);

          if (!data.success) {
            throw new Error(
              data.error || "Profile not found."
            );
          }

          // GET PHOTO FROM POSTGRESQL

          const databasePhoto =
            data.photo_url || data.photo || "";

          const uploadedPhoto =
            typeof databasePhoto === "string"
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

            photo: uploadedPhoto

          };

          // UPDATE UI AND LOCAL STORAGE

          synchronizeProfile(loadedProfile);

          console.log(
            "Profile and photo loaded successfully."
          );

        } catch (error) {

          console.error("LOAD PROFILE ERROR:", error);

          // KEEP CACHED PROFILE IF DATABASE IS UNAVAILABLE

          const cachedProfile =
            localStorage.getItem("mindcareProfile");

          if (!cachedProfile) {

            const fallbackProfile = {

              name:
                user.displayName || "User",

              email:
                user.email || "user@example.com",

              photo: ""

            };

            setProfile(fallbackProfile);
            setFormData(fallbackProfile);
          }

        } finally {

          setLoading(false);

        }
      }
    );

    return () => unsubscribe();

  }, []);


  // =========================================
  // HANDLE TEXT INPUT
  // =========================================

  const handleChange = (event) => {

    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };


  // =========================================
  // HANDLE PROFILE PHOTO
  // =========================================

  const handlePhotoChange = (event) => {

    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {

      setMessage("Please select an image file.");

      return;
    }

    if (file.size > 2 * 1024 * 1024) {

      setMessage(
        "Please choose an image smaller than 2 MB."
      );

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {

      setFormData((previous) => ({
        ...previous,
        photo: reader.result
      }));

      setMessage("Photo selected. Click Save Changes to save it.");

    };

    reader.onerror = () => {

      setMessage("Unable to read the selected image.");

    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };


  // =========================================
  // SAVE PROFILE TO POSTGRESQL
  // =========================================

  const handleSave = async () => {

    const user = auth.currentUser;

    if (!user) {

      setMessage("Please log in first.");

      return;
    }

    const name = formData.name.trim();

    const email = formData.email.trim();

    if (!name) {

      setMessage("Please enter your name.");

      return;
    }

    if (!email) {

      setMessage("Please enter your email.");

      return;
    }

    setSaving(true);

    setMessage("");

    try {

      // SEND PROFILE AND PHOTO TO BACKEND

      const response = await fetch(
        `${API_URL}/users`,
        {

          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            firebase_uid: user.uid,

            name: name,

            email: email,

            photo_url: formData.photo || ""

          })

        }
      );

      const data = await response.json();

      console.log("PROFILE SAVE RESPONSE:", data);

      if (!response.ok || data.success === false) {

        throw new Error(
          data.error || "Failed to save profile."
        );
      }

      // UPDATE PROFILE ONLY AFTER DATABASE SUCCESS

      const updatedProfile = {

        name: name,

        email: email,

        photo: formData.photo || ""

      };

      synchronizeProfile(updatedProfile);

      setIsEditing(false);

      setMessage(
        "Profile saved successfully 💙"
      );

      console.log(
        "Profile and photo saved to PostgreSQL successfully."
      );

    } catch (error) {

      console.error("PROFILE SAVE ERROR:", error);

      setMessage(
        error.message || "Unable to save profile."
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
  // REMOVE PROFILE PHOTO
  // =========================================

  const removePhoto = () => {

    setFormData((previous) => ({
      ...previous,
      photo: ""
    }));

    setMessage(
      "Photo removed. Click Save Changes to confirm."
    );

  };


  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = async () => {

    const confirmLogout = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmLogout) return;

    try {

      await signOut(auth);

      localStorage.removeItem("mindcareLoggedIn");

      // Profile photo is stored in PostgreSQL.
      // Removing the local cache will not delete the database photo.

      localStorage.removeItem("mindcareProfile");

      window.location.href = "/";

    } catch (error) {

      console.error("LOGOUT ERROR:", error);

      setMessage(
        "Unable to logout. Please try again."
      );

    }
  };


  // =========================================
  // GET INITIAL FROM EMAIL
  // =========================================

  const getInitial = () => {

    const email =
      formData.email ||
      profile.email ||
      auth.currentUser?.email ||
      "";

    if (!email.trim()) return "U";

    const emailName = email.trim().split("@")[0];

    return emailName.charAt(0).toUpperCase() || "U";
  };


  // =========================================
  // UI
  // =========================================

  return (

    <div className="profile-page">

      {/* HEADER */}

      <div className="profile-header">

        <div>

          <h1>My Profile</h1>

          <p>
            Manage your personal information and account details.
          </p>

        </div>

        {!isEditing && (

          <button
            className="edit-profile-btn"
            onClick={() => {
              setIsEditing(true);
              setMessage("");
            }}
          >
            ✏️ Edit Profile
          </button>

        )}

      </div>


      {/* MESSAGE */}

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


      {/* PROFILE CARD */}

      <div className="profile-card">

        {/* PROFILE PHOTO */}

        <div className="profile-photo-section">

          <div className="profile-photo">

            {formData.photo ? (

              <img
                src={formData.photo}
                alt="Profile"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
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
                onChange={handlePhotoChange}
                hidden
              />

              {formData.photo && (

                <button
                  type="button"
                  className="remove-photo-btn"
                  onClick={removePhoto}
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


        {/* PROFILE INFORMATION */}

        <div className="profile-information">

          {/* FULL NAME */}

          <div className="form-group">

            <label>Full Name</label>

            {isEditing ? (

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
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

            <label>Email Address</label>

            {isEditing ? (

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
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

            <label>Account Type</label>

            <div className="profile-value account-type">

              <span>🌿</span>

              MindCare Wellness User

            </div>

          </div>


          {/* SAVE / CANCEL */}

          {isEditing && (

            <div className="profile-buttons">

              <button
                type="button"
                className="save-profile-btn"
                onClick={handleSave}
                disabled={saving}
              >

                {saving
                  ? "Saving..."
                  : "✓ Save Changes"}

              </button>


              <button
                type="button"
                className="cancel-profile-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

            </div>

          )}

        </div>

      </div>


      {/* PRIVACY CARD */}

      <div className="privacy-card">

        <div className="privacy-icon">
          🔒
        </div>

        <div>

          <h3>Your Privacy Matters</h3>

          <p>
            Your profile information is associated with your
            secure account and stored in the MindCare database.
            MindCare AI provides general wellness support and
            is not a substitute for professional medical care.
          </p>

        </div>

      </div>


      {/* LOGOUT */}

      <div className="logout-section">

        <button
          type="button"
          className="logout-btn"
          onClick={handleLogout}
        >
          🚪 Logout
        </button>

      </div>

    </div>

  );
}

export default Profile;
