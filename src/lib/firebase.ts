
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from "firebase/auth";

// Load Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Basic validation to ensure variables are loaded
if (!firebaseConfig.projectId) {
  console.error("Firebase projectId is not set. Make sure your .env.local file is configured correctly with NEXT_PUBLIC_ prefixes.");
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// To reduce the bundle size, we initialize a lighter-weight Auth instance.
// This includes only the persistence and pop-up/redirect logic needed for this app.
// If you need to add other auth features (e.g., phone auth, session persistence),
// you may need to import additional modules here or revert to using getAuth(app).
const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

export { app, db, auth };
