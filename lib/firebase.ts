import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD6gb4z58EAANhRpCwqEqBETz3LsucgWmo",
  authDomain: "studio-3440483519-68ed7.firebaseapp.com",
  projectId: "studio-3440483519-68ed7",
  storageBucket: "studio-3440483519-68ed7.firebasestorage.app",
  messagingSenderId: "250555537883",
  appId: "1:250555537883:web:6f9214d094c1c25599effe"
};

let app = undefined;
let db: Firestore | null = null;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (typeof window !== 'undefined') {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (err) {
    console.warn("Firebase initialization warning (fallback enabled):", err);
  }
}

// Configured admin emails
export const ADMIN_EMAILS: string[] = [
  'rishiuttamsahu@gmail.com',
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some(admin => admin.toLowerCase() === email.trim().toLowerCase());
}

export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export { app, db, auth, googleProvider, onAuthStateChanged };

