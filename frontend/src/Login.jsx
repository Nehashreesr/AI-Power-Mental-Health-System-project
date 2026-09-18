
import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";

import {
  auth,
  googleProvider
} from "./firebase";

import "./Login.css";

const API_URL = "http://127.0.0.1:5000";

function Login({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Save Firebase user to PostgreSQL
  const saveUserToDatabase = async (user, customName = "") => {
    if (!user) return;

    const profile = {
      name:
        customName ||
        user.displayName ||
        "User",

      email:
        user.email ||
        "user@example.com",

      photo:
        user.photoURL ||
        ""
    };

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firebase_uid: user.uid,
          name: profile.name,
          email: profile.email,
          photo_url: profile.photo
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(
          "DATABASE USER SAVE ERROR:",
          data.error
        );
      } else {
        console.log(
          "User saved to PostgreSQL successfully."
        );
      }
    } catch (error) {
      console.error(
        "DATABASE CONNECTION ERROR:",
        error
      );
    }

    // LocalStorage is only used for frontend UI fallback
    localStorage.setItem(
      "mindcareProfile",
      JSON.stringify(profile)
    );

    window.dispatchEvent(
      new CustomEvent("mindcareProfileUpdated", {
        detail: profile
      })
    );
  };

  // Email Login / Signup
  const handleEmailAuth = async (event) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setMessage("Please enter your name.");
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setMessage(
            "Password must contain at least 6 characters."
          );
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setMessage("Passwords do not match.");
          setLoading(false);
          return;
        }

        const result =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

        await updateProfile(result.user, {
          displayName: name.trim()
        });

        // Save user in PostgreSQL
        await saveUserToDatabase(
          result.user,
          name.trim()
        );

        onLogin(result.user);
      } else {
        const result =
          await signInWithEmailAndPassword(
            auth,
            email,
            password
          );

        // Save/update user in PostgreSQL
        await saveUserToDatabase(result.user);

        onLogin(result.user);
      }
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        setMessage(
          "This email is already registered."
        );
      } else if (
        error.code === "auth/invalid-email"
      ) {
        setMessage(
          "Please enter a valid email address."
        );
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        setMessage(
          "Incorrect email or password."
        );
      } else if (
        error.code === "auth/user-not-found"
      ) {
        setMessage(
          "No account found with this email."
        );
      } else if (
        error.code === "auth/weak-password"
      ) {
        setMessage(
          "Password is too weak."
        );
      } else {
        setMessage(
          "Something went wrong. Please try again."
        );
      }
    }

    setLoading(false);
  };

  // Google Login
  const handleGoogleLogin = async () => {
    setMessage("");
    setLoading(true);

    try {
      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      // Save Google user in PostgreSQL
      await saveUserToDatabase(result.user);

      onLogin(result.user);
    } catch (error) {
      console.error(
        "GOOGLE LOGIN ERROR:",
        error
      );

      if (
        error.code ===
        "auth/popup-closed-by-user"
      ) {
        setMessage(
          "Google login was cancelled."
        );
      } else if (
        error.code ===
        "auth/popup-blocked"
      ) {
        setMessage(
          "Please allow popups for Google login."
        );
      } else {
        setMessage(
          "Google login failed. Please try again."
        );
      }
    }

    setLoading(false);
  };

  // Forgot Password
  const handleForgotPassword = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setMessage(
        "Enter your email address first."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await sendPasswordResetEmail(
        auth,
        email
      );

      setMessage(
        "Password reset link has been sent to your email."
      );
    } catch (error) {
      console.error(
        "PASSWORD RESET ERROR:",
        error
      );

      if (
        error.code ===
        "auth/user-not-found"
      ) {
        setMessage(
          "No account found with this email."
        );
      } else if (
        error.code ===
        "auth/invalid-email"
      ) {
        setMessage(
          "Please enter a valid email address."
        );
      } else {
        setMessage(
          "Unable to send reset link."
        );
      }
    }

    setLoading(false);
  };

  // Switch Login / Signup
  const switchMode = () => {
    setMessage("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");

    setMode(
      mode === "login"
        ? "signup"
        : "login"
    );
  };

  return (
    <div className="login-page">

      <div className="login-brand">

        <div className="login-logo">
          🧠
        </div>

        <h1>MindCare AI</h1>

        <p>Wellness Companion</p>

      </div>

      <div className="login-card">

        {/* LOGIN */}
        {mode === "login" && (
          <>
            <div className="login-header">

              <h2>
                Welcome back 👋
              </h2>

              <p>
                Sign in to continue your wellness journey
              </p>

            </div>

            <form onSubmit={handleEmailAuth}>

              <label>Email</label>

              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

              <label>Password</label>

              <div className="password-wrapper">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="eye-button"
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

              <button
                type="button"
                className="forgot-button"
                onClick={() => {
                  setMessage("");
                  setMode("forgot");
                }}
              >
                Forgot password?
              </button>

              {message && (
                <div className="login-message">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="primary-login-button"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : "Log In"}
              </button>

            </form>

            <div className="divider">
              <span>or</span>
            </div>

            <button
              className="social-button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <span className="google-icon">
                G
              </span>

              Continue with Google
            </button>

            <p className="switch-text">

              Don't have an account?

              <button
                onClick={switchMode}
              >
                Sign Up
              </button>

            </p>
          </>
        )}

        {/* SIGNUP */}
        {mode === "signup" && (
          <>
            <div className="login-header">

              <h2>
                Create account ✨
              </h2>

              <p>
                Start your MindCare AI journey
              </p>

            </div>

            <form onSubmit={handleEmailAuth}>

              <label>Full Name</label>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
              />

              <label>Email</label>

              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

              <label>Password</label>

              <div className="password-wrapper">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="eye-button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

              <label>
                Confirm Password
              </label>

              <div className="password-wrapper">

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  required
                />

                <button
                  type="button"
                  className="eye-button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                >
                  {showConfirmPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

              {message && (
                <div className="login-message">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="primary-login-button"
                disabled={loading}
              >
                {loading
                  ? "Creating account..."
                  : "Create Account"}
              </button>

            </form>

            <div className="divider">
              <span>or</span>
            </div>

            <button
              className="social-button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <span className="google-icon">
                G
              </span>

              Continue with Google
            </button>

            <p className="switch-text">

              Already have an account?

              <button
                onClick={switchMode}
              >
                Log In
              </button>

            </p>
          </>
        )}

        {/* FORGOT PASSWORD */}
        {mode === "forgot" && (
          <>
            <div className="login-header">

              <div className="forgot-icon">
                🔐
              </div>

              <h2>
                Reset Password
              </h2>

              <p>
                Enter your email and we'll send you
                a password reset link.
              </p>

            </div>

            <form onSubmit={handleForgotPassword}>

              <label>Email</label>

              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

              {message && (
                <div className="login-message">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="primary-login-button"
                disabled={loading}
              >
                {loading
                  ? "Sending..."
                  : "Send Reset Link"}
              </button>

            </form>

            <button
              className="back-login-button"
              onClick={() => {
                setMessage("");
                setMode("login");
              }}
            >
              ← Back to Login
            </button>

          </>
        )}

      </div>

      <p className="login-footer">
        Your wellness space, whenever you need it 💙
      </p>

    </div>
  );
}

export default Login;
