
import React from "react";
import "./SafetySupport.css";

function SafetySupport({ onBackToChat }) {

  // =========================================
  // CONTACT EMERGENCY SERVICES
  // =========================================

  const handleEmergency = () => {
    window.location.href = "tel:112";
  };

  // =========================================
  // CONTACT SOMEONE I TRUST - WHATSAPP
  // =========================================

  const handleTrustedContact = () => {

    let trustedContact = localStorage.getItem(
      "mindcareTrustedContact"
    );

    // If contact is not saved, ask for number
    if (!trustedContact) {

      const number = window.prompt(
        "Enter your trusted contact's WhatsApp number with country code.\nExample: +91 9876543210"
      );

      if (!number) {
        return;
      }

      // Remove spaces, + and other symbols
      trustedContact = number.replace(/\D/g, "");

      // Check whether number is entered
      if (!trustedContact) {
        alert("Please enter a valid WhatsApp number.");
        return;
      }

      // Save number
      localStorage.setItem(
        "mindcareTrustedContact",
        trustedContact
      );
    }

    // =========================================
    // WHATSAPP MESSAGE
    // =========================================

    const message =
      "Hi, I could use some support right now. Could you please contact me?";

    // Create WhatsApp URL
    const whatsappURL =
      `https://wa.me/${trustedContact}?text=${encodeURIComponent(
        message
      )}`;

    // Open WhatsApp
    window.open(
      whatsappURL,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================
  // CHANGE TRUSTED CONTACT
  // =========================================

  const changeTrustedContact = () => {

    const number = window.prompt(
      "Enter the new trusted contact's WhatsApp number with country code.\nExample: +91 9876543210"
    );

    if (!number) {
      return;
    }

    const cleanedNumber =
      number.replace(/\D/g, "");

    if (!cleanedNumber) {
      alert("Please enter a valid WhatsApp number.");
      return;
    }

    localStorage.setItem(
      "mindcareTrustedContact",
      cleanedNumber
    );

    alert("Trusted contact updated successfully.");
  };

  return (
    <div className="safety-page">

      <div className="safety-card">

        {/* =====================================
            HEADER
        ===================================== */}

        <div className="safety-icon">
          🛡️
        </div>

        <h1>
          Safety Support
        </h1>

        {/* =====================================
            SUPPORT MESSAGE
        ===================================== */}

        <p className="safety-message">
          You're not alone. It may help to talk
          with someone you trust right now.
        </p>

        <p className="emergency-message">
          If you feel you may be in immediate
          danger, contact local emergency services
          or go to the nearest hospital.
        </p>

        {/* =====================================
            EMERGENCY SERVICES
        ===================================== */}

        <button
          type="button"
          className="safety-button emergency-button"
          onClick={handleEmergency}
        >
          <span>
            📞
          </span>

          <span>
            Contact Emergency Services
          </span>
        </button>

        {/* =====================================
            WHATSAPP TRUSTED CONTACT
        ===================================== */}

        <button
          type="button"
          className="safety-button trusted-button"
          onClick={handleTrustedContact}
        >
          <span>
            💬
          </span>

          <span>
            Message Someone I Trust on WhatsApp
          </span>
        </button>

       

        {/* =====================================
            CONTINUE CHAT
        ===================================== */}

        <button
          type="button"
          className="safety-button chat-button"
          onClick={onBackToChat}
        >
          <span>
            💬
          </span>

          <span>
            Continue with MindCare AI
          </span>
        </button>

        {/* =====================================
            DISCLAIMER
        ===================================== */}

        <div className="safety-disclaimer">

          <strong>
            Important:
          </strong>{" "}

          MindCare AI provides general wellness
          support and is not a medical service.

        </div>

      </div>

    </div>
  );
}

export default SafetySupport;

