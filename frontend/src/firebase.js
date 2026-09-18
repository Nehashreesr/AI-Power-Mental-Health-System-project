
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDPPCbi3BjL9Hsx7BVci2ik-QNEeGJKuMw",
  authDomain: "mindcare-ai-3c98a.firebaseapp.com",
  projectId: "mindcare-ai-3c98a",
  storageBucket: "mindcare-ai-3c98a.firebasestorage.app",
  messagingSenderId: "460659922077",
  appId: "1:460659922077:web:04c01378d32700c0b97074",
  measurementId: "G-P8H1YHZ334"
};

const app = initializeApp(firebaseConfig);

// Firebase Authentication
export const auth = getAuth(app);

// Google Login
export const googleProvider = new GoogleAuthProvider();

