# MindCare AI - Local Hugging Face Chatbot

A beginner-friendly mental wellness chatbot with:

- React frontend
- Flask backend
- Hugging Face Transformers
- Local model loading
- No Hugging Face API key
- Basic safety keyword layer

## Architecture

React -> Flask -> Transformers -> Local Hugging Face model -> Flask -> React

## Backend setup

```bash
cd backend
python -m venv venv
```

Windows:
```bash
venv\Scripts\activate
```

Linux/macOS:
```bash
source venv/bin/activate
```

Install:
```bash
pip install -r requirements.txt
```

Run:
```bash
python app.py
```

The first run downloads the public Hugging Face model:
`microsoft/DialoGPT-medium`

No Hugging Face API key is required.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown by Vite, normally:
`http://localhost:5173`

## Important

This is a student-project wellness chatbot. It is not a medical diagnostic or emergency-care system. The included safety layer is only a basic demonstration and should not be treated as a complete clinical safety mechanism.
