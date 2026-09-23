import React, {
  useEffect,
  useState
} from "react";

import "./SafetySupport.css";

import {
  getAuth,
  onAuthStateChanged
} from "firebase/auth";

const API_URL =
  "http://127.0.0.1:5000";

function SafetySupport({ onBackToChat }) {

  const [trustedContact, setTrustedContact] =
    useState("");

  const [contactInput, setContactInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [loadingContact, setLoadingContact] =
    useState(true);

  const [savingContact, setSavingContact] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [showContactForm, setShowContactForm] =
    useState(false);


  // =========================================
  // GET CURRENT FIREBASE USER
  // =========================================

  const getCurrentUser = () => {

    const auth =
      getAuth();

    return auth.currentUser;
  };


  // =========================================
  // LOAD TRUSTED CONTACT
  // =========================================

  const loadTrustedContact =
    async (user) => {

      if (!user) {

        setTrustedContact("");
        setLoadingContact(false);

        return;
      }

      try {

        setLoadingContact(true);

        const response =
          await fetch(
            `${API_URL}/users/${user.uid}/trusted-contact`
          );

        const data =
          await response.json();

        if (
          response.ok &&
          data.success
        ) {

          const savedNumber =
            data.trusted_contact || "";

          setTrustedContact(
            savedNumber
          );

          setContactInput(
            savedNumber
          );

        } else {

          setTrustedContact("");
          setContactInput("");
        }

      } catch (error) {

        console.error(
          "LOAD TRUSTED CONTACT ERROR:",
          error
        );

        setTrustedContact("");
        setContactInput("");

      } finally {

        setLoadingContact(false);
      }
    };


  // =========================================
  // FIREBASE LOGIN
  // =========================================

  useEffect(() => {

    const auth =
      getAuth();

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {

          loadTrustedContact(
            user
          );
        }
      );

    return () => {
      unsubscribe();
    };

  }, []);


  // =========================================
  // SAVE TRUSTED CONTACT
  // =========================================

  const saveTrustedContact =
    async () => {

      const user =
        getCurrentUser();

      if (!user) {

        setMessage(
          "Please log in first."
        );

        return false;
      }


      // -----------------------------------------
      // CLEAN NUMBER
      // -----------------------------------------

      const cleanedNumber =
        contactInput.replace(
          /\D/g,
          ""
        );


      // -----------------------------------------
      // VALIDATE NUMBER
      // -----------------------------------------

      if (
        cleanedNumber.length <
        10
      ) {

        setMessage(
          "Please enter a valid WhatsApp number with country code."
        );

        return false;
      }


      // -----------------------------------------
      // UPDATE UI IMMEDIATELY
      // -----------------------------------------

      setTrustedContact(
        cleanedNumber
      );

      setContactInput(
        cleanedNumber
      );

      setShowContactForm(
        false
      );

      setMessage(
        "Trusted contact saved."
      );


      // -----------------------------------------
      // DATABASE SAVE IN BACKGROUND
      // -----------------------------------------

      setSavingContact(true);

      try {

        console.log(
          "Saving trusted contact to PostgreSQL..."
        );

        const response =
          await fetch(
            `${API_URL}/users/${user.uid}/trusted-contact`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                trusted_contact:
                  cleanedNumber
              })
            }
          );

        const data =
          await response.json();

        console.log(
          "TRUSTED CONTACT RESPONSE:",
          data
        );

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.error ||
            "Failed to save trusted contact."
          );
        }

        console.log(
          "Trusted contact saved to PostgreSQL successfully."
        );

      } catch (error) {

        console.error(
          "SAVE TRUSTED CONTACT ERROR:",
          error
        );

        /*
         UI already shows the contact.
         Inform user only if database failed.
        */

        setMessage(
          "Contact updated, but database save failed."
        );

      } finally {

        setSavingContact(false);
      }

      return true;
    };


  // =========================================
  // CONTACT EMERGENCY SERVICES
  // =========================================

  const handleEmergency = () => {

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );

    if (isMobile) {

      window.location.href =
        "tel:112";

    } else {

      alert(
        "Emergency Number: 112\n\n" +
        "You are using MindCare AI on a laptop or desktop.\n\n" +
        "Please use a mobile phone to call 112."
      );
    }
  };


  // =========================================
  // OPEN TRUSTED CONTACT
  // =========================================

  const handleTrustedContact =
    () => {

      setMessage("");

      if (!trustedContact) {

        setContactInput("");

        setShowContactForm(
          true
        );

        return;
      }

      openWhatsApp(
        trustedContact
      );
    };


  // =========================================
  // OPEN WHATSAPP
  // =========================================

  const openWhatsApp =
    (number) => {

      if (!number) {
        return;
      }

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

  const changeTrustedContact =
    () => {

      setContactInput(
        trustedContact
      );

      setMessage("");

      setShowContactForm(
        true
      );
    };


  // =========================================
  // CANCEL CONTACT EDIT
  // =========================================

  const cancelContactEdit =
    () => {

      setContactInput(
        trustedContact
      );

      setMessage("");

      setShowContactForm(
        false
      );
    };


  // =========================================
  // SAVE + OPEN WHATSAPP
  // =========================================

  const saveAndMessage =
    async () => {

      const saved =
        await saveTrustedContact();

      if (saved) {

        const cleanedNumber =
          contactInput.replace(
            /\D/g,
            ""
          );

        openWhatsApp(
          cleanedNumber
        );
      }
    };


  // =========================================
  // UI
  // =========================================

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
          You're not alone. It may help to
          talk with someone you trust right now.
        </p>

        <p className="emergency-message">
          If you feel you may be in immediate
          danger, contact local emergency
          services or go to the nearest hospital.
        </p>


        {/* =====================================
            EMERGENCY
        ===================================== */}

        <button
          type="button"
          className="safety-button emergency-button"
          onClick={
            handleEmergency
          }
        >

          <span>
            📞
          </span>

          <span>
            Contact Emergency Services — 112
          </span>

        </button>


        {/* =====================================
            WHATSAPP
        ===================================== */}

        <button
          type="button"
          className="safety-button trusted-button"
          onClick={
            handleTrustedContact
          }
          disabled={
            loadingContact
          }
        >

          <span>
            💬
          </span>

          <span>

            {loadingContact
              ? "Loading..."
              : trustedContact
                ? "Message Someone I Trust on WhatsApp"
                : "Add Someone I Trust"}

          </span>

        </button>


        {/* =====================================
            TRUSTED CONTACT FORM
        ===================================== */}

        {showContactForm && (

          <div className="trusted-contact-form">

            <h3>
              Trusted Contact
            </h3>

            <p>
              Enter the WhatsApp number with
              country code.
            </p>


            <input
              type="tel"
              value={
                contactInput
              }
              onChange={(e) =>
                setContactInput(
                  e.target.value
                )
              }
              placeholder="+91 9876543210"
              className="trusted-contact-input"
            />


            <div className="trusted-contact-actions">

              <button
                type="button"
                className="save-contact-button"
                onClick={
                  saveAndMessage
                }
                disabled={
                  savingContact
                }
              >

                {savingContact
                  ? "Saving..."
                  : "Save & Message"}

              </button>


              <button
                type="button"
                className="cancel-contact-button"
                onClick={
                  cancelContactEdit
                }
                disabled={
                  savingContact
                }
              >
                Cancel
              </button>

            </div>

          </div>

        )}


        {/* =====================================
            CONTACT STATUS
        ===================================== */}

        {trustedContact &&
          !showContactForm && (

            <div className="trusted-contact-status">

              <span>
                ✓ Trusted contact added
              </span>

            </div>

          )}


        {/* =====================================
            CHANGE CONTACT
        ===================================== */}

        {trustedContact && (

          <button
            type="button"
            className="change-contact-button"
            onClick={
              changeTrustedContact
            }
          >
            Change Trusted Contact
          </button>

        )}


        {/* =====================================
            MESSAGE
        ===================================== */}

        {message && (

          <p className="trusted-contact-message">
            {message}
          </p>

        )}


        {/* =====================================
            CONTINUE CHAT
        ===================================== */}

        <button
          type="button"
          className="safety-button chat-button"
          onClick={
            onBackToChat
          }
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

          MindCare AI provides general
          wellness support and is not a
          medical service.

        </div>

      </div>

    </div>
  );
}

export default SafetySupport;