// No npm, no build step: Firebase's own CDN modules, pinned to one version.
// Every other file imports Firebase functions from HERE (./firebase.js),
// never straight from gstatic.com — one place to bump the version later.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { FIREBASE_CONFIG, DEFAULT_ORG } from "./config.js";

export { DEFAULT_ORG };

export const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);

// Offline-first: Firestore keeps a local IndexedDB cache of every document
// this user's role is allowed to query (firestore.rules already scopes
// that), so the cache is naturally "selective" per role — no custom sync
// code needed. persistentMultipleTabManager keeps it safe across tabs.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Secondary app: used ONLY so Director/Admin can create a new login
// (member/admin account) without signing themselves out — Firebase's
// client SDK has no "create another user" call that leaves your own
// session alone, so this isolated second App instance is the standard
// client-only workaround.
function getSecondaryApp() {
  const existing = getApps().find((a) => a.name === "Secondary");
  return existing || initializeApp(FIREBASE_CONFIG, "Secondary");
}
export const secondaryAuth = getAuth(getSecondaryApp());

export {
  // auth
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  // firestore
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
};
