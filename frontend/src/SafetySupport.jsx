import React, { useEffect, useState } from "react";
import "./SafetySupport.css";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const API_URL = "http://127.0.0.1:5000";

function SafetySupport({ onBackToChat }) {
  const [trustedContact, setTrustedContact] = useState("");
  const [loading, setLoading] = useState(true);

  // =========================================
  // GET CURRENT FIREBASE USER
  // =========================================

  const getCurrentUser = () => {
    const auth = getAuth();
    return auth.currentUser;
  };

  // =========================================
  // LOAD TRUSTED CONTACT FROM DATABASE
  // =========================================

  const loadTrustedContact = async (user) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/users/${user.uid}/trusted-contact`
      );

      const data = await response.json();

      if (data.success) {
        setTrustedContact(data.trusted_contact || "");
      } else {
        setTrustedContact("");
      }
    } catch (error) {
      console.error("LOAD TRUSTED CONTACT ERROR:", error);
      setTrustedContact("");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // CHECK LOGIN
  // =========================================

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadTrustedContact(user);
      } else {
        setTrustedContact("");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // =========================================
  // SAVE TRUSTED CONTACT TO DATABASE
  // =========================================

  const saveTrustedContact = async (number) => {
    try {
      const user = getCurrentUser();

      if (!user) {
        alert("Please login first.");
        return false;
      }

      const response = await fetch(
        `${API_URL}/users/${user.uid}/trusted-contact`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trusted_contact: number,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to save trusted contact"
        );
      }

      setTrustedContact(number);

      return true;
    } catch (error) {
      console.error("SAVE TRUSTED CONTACT ERROR:", error);

      alert("Could not save trusted contact.");

      return false;
    }
  };

  // =========================================
  // CONTACT EMERGENCY SERVICES
  // =========================================

  const handleEmergency = () => {
    // Detect whether the user is using a mobile device
    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      // Mobile → open phone dialer
      window.location.href = "tel:112";
    } else {
      // Laptop/Desktop → cannot directly make phone call
      alert(
        "Emergency Number: 112\n\n" +
        "You are using MindCare AI on a laptop or desktop.\n\n" +
        "Please use a mobile phone to call 112."
      );
    }
  };

  // =========================================
  // WHATSAPP TRUSTED CONTACT
  // =========================================

  const handleTrustedContact = async () => {
    let number = trustedContact;

    // Ask for number if not already saved
    if (!number) {
      const enteredNumber = window.prompt(
        "Enter your trusted contact's WhatsApp number with country code.\nExample: +91 9876543210"
      );

      if (!enteredNumber) {
        return;
      }

      number = enteredNumber.replace(/\D/g, "");

      if (!number) {
        alert(
          "Please enter a valid WhatsApp number."
        );
        return;
      }

      // Save to PostgreSQL
      const saved = await saveTrustedContact(number);

      if (!saved) {
        return;
      }
    }

    // =========================================
    // WHATSAPP MESSAGE
    // =========================================

    const message =
      "Hi, I could use some support right now. Could you please contact me?";

    const whatsappURL =
      `https://wa.me/${number}?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      whatsappURL,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================
  // CHANGE TRUSTED CONTACT
  // =========================================

  const changeTrustedContact = async () => {
    const enteredNumber = window.prompt(
      "Enter the new trusted contact's WhatsApp number with country code.\nExample: +91 9876543210"
    );

    if (!enteredNumber) {
      return;
    }

    const cleanedNumber =
      enteredNumber.replace(/\D/g, "");

    if (!cleanedNumber) {
      alert(
        "Please enter a valid WhatsApp number."
      );
      return;
    }

    const saved = await saveTrustedContact(
      cleanedNumber
    );

    if (saved) {
      alert(
        "Trusted contact updated successfully."
      );
    }
  };

  return (
    <div className="safety-page">

      <div className="safety-card">

        {/* HEADER */}

        <div className="safety-icon">
          🛡️
        </div>

        <h1>
          Safety Support
        </h1>

        {/* SUPPORT MESSAGE */}

        <p className="safety-message">
          You're not alone. It may help to
          talk with someone you trust right now.
        </p>

        <p className="emergency-message">
          If you feel you may be in immediate
          danger, contact local emergency
          services or go to the nearest hospital.
        </p>

        {/* EMERGENCY */}

        <button
          type="button"
          className="safety-button emergency-button"
          onClick={handleEmergency}
        >
          <span>📞</span>

          <span>
            Contact Emergency Services — 112
          </span>
        </button>

        {/* WHATSAPP */}

        <button
          type="button"
          className="safety-button trusted-button"
          onClick={handleTrustedContact}
          disabled={loading}
        >
          <span>💬</span>

          <span>
            {loading
              ? "Loading..."
              : "Message Someone I Trust on WhatsApp"}
          </span>
        </button>

        {/* CHANGE CONTACT */}

        {trustedContact && (
          <button
            type="button"
            className="change-contact-button"
            onClick={changeTrustedContact}
          >
            Change Trusted Contact
          </button>
        )}

        {/* CONTINUE CHAT */}

        <button
          type="button"
          className="safety-button chat-button"
          onClick={onBackToChat}
        >
          <span>💬</span>

          <span>
            Continue with MindCare AI
          </span>
        </button>

        {/* DISCLAIMER */}

        <div className="safety-disclaimer">

          <strong>
            Important:
          </strong>{" "}

          MindCare AI provides general
          wellness support and is not a
          medical service.

        </div>

      </div>

    </div>
  );
}

export default SafetySupport;