# MindCare AI

## AI-Powered Mental Health Monitoring & Wellness System

MindCare AI is a web-based, non-medical wellness platform designed to help users monitor their mood, understand emotional patterns, interact with an AI wellness chatbot, and receive general wellness recommendations.

> **Disclaimer:** MindCare AI is a general wellness and emotional-support project. It is not a medical service, does not provide medical diagnosis or treatment, and should not replace professional care.

---

## Features

### 🔐 User Authentication
- Email and password authentication
- Google Sign-In
- Firebase Authentication

### 💬 AI Wellness Chatbot
- AI-powered conversational support
- Quick prompts
- Voice input
- Text-to-speech responses
- Basic safety and crisis keyword detection

### 😊 Mood Tracker
- Record daily moods
- Add optional mood notes
- Store mood history
- Track mood source and confidence

### 📊 Mood Analytics
- View recorded mood information
- Analyze mood patterns
- Display mood data visually

### 🎙️ Voice Emotion Detection
- Record voice through the browser
- Analyze voice emotion
- Display predicted emotion
- Display prediction confidence
- Store voice emotion results as mood entries

### 🌱 AI Wellness
- Mood-based wellness recommendations
- Suggested activities
- Exercise suggestions
- Music recommendations

### 🛡️ Safety Support
- Emergency support information
- Trusted contact feature
- WhatsApp messaging support

### 👤 Profile & Settings
- Update profile name
- Upload profile photo
- Notification preferences
- Privacy information
- Application information

### 🗄️ PostgreSQL Database
- User profiles
- Mood entries
- Chat history
- Trusted contacts
- Notification settings

  ## AI & Machine Learning

MindCare AI uses Hugging Face technologies for its AI and machine learning features.

### Hugging Face

Hugging Face is used for:

- AI-powered chatbot responses
- Voice emotion recognition
- Machine learning model integration
- AI model inference

### Hugging Face API

The Flask backend communicates with Hugging Face to access AI model capabilities.

The Hugging Face API is authenticated using a **Hugging Face Access Token (`HF_TOKEN`)** stored securely in the backend `.env` file.

```env
HF_TOKEN=your_huggingface_access_token

---

## Technology Stack

### Frontend
- React.js
- Vite
- JavaScript
- HTML5
- CSS3
- Recharts
- Framer Motion
- React Icons

### Backend
- Python
- Flask
- Flask-CORS
- REST API

### Authentication
- Firebase Authentication
- Email/Password Authentication
- Google Authentication

### Database
- PostgreSQL
- Neon PostgreSQL

### AI & Machine Learning
- Hugging Face
- Hugging Face API
- Voice Emotion Recognition
- `superb/hubert-large-superb-er`

---

## System Architecture

```text
                    ┌──────────────────────┐
                    │        User          │
                    │     Web Browser      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React + Vite       │
                    │      Frontend        │
                    └──────────┬───────────┘
                               │
                          REST API
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Flask Backend      │
                    │       Python         │
                    └──────┬────────┬──────┘
                           │        │
                ┌──────────┘        └──────────┐
                ▼                              ▼
       ┌─────────────────┐            ┌─────────────────┐
       │   PostgreSQL    │            │  Hugging Face   │
       │      Neon       │            │    AI / ML      │
       └─────────────────┘            └─────────────────┘
                ▲
                │
       ┌────────┴────────┐
       │     Firebase    │
       │  Authentication │
       └─────────────────┘

How the Application Works
1. User Login

The user signs in using Firebase Authentication.

2. User Profile

After authentication, the user's basic profile information is synchronized with the PostgreSQL database.

3. Mood Tracking

The user selects a mood and can optionally add a note.

The mood information is stored in PostgreSQL.

4. Mood Analytics

Stored mood entries are retrieved from PostgreSQL and displayed in the analytics section.

5. AI Chatbot

The frontend sends the user's message to the Flask backend.

The backend performs safety checking and communicates with the AI service to generate a general wellness response.

6. Voice Emotion Detection

The browser records the user's voice and sends the audio to the Flask backend.

The voice emotion model predicts an emotion and confidence value.

The result can then be stored as a mood entry.

7. AI Wellness

The AI Wellness section uses recent mood information to provide general wellness activities and recommendations.

8. Safety Support

The Safety Support section provides general emergency information and allows users to configure a trusted contact for messaging support.

Project Status

Completed

MindCare AI was developed as a final-year engineering project to demonstrate the integration of:

Frontend development
Backend API development
Firebase Authentication
PostgreSQL database management
Artificial Intelligence
Machine Learning
Voice Emotion Recognition
Data Visualization
Wellness-oriented user features

