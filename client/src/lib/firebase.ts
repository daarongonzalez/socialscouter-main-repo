import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "social-scouter.firebaseapp.com",
  projectId: "social-scouter",
  storageBucket: "social-scouter.firebasestorage.app",
  messagingSenderId: "747837356410",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-TNHTNEKJ4Z"
};

// Initialize Firebase only if no apps exist
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

// Sign in with Google redirect
export function signInWithGoogle() {
  return signInWithRedirect(auth, provider);
}

// Sign out
export function logOut() {
  return signOut(auth);
}

// Handle redirect result on page load
export function handleRedirectResult() {
  return getRedirectResult(auth);
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: any) => void) {
  return onAuthStateChanged(auth, callback);
}