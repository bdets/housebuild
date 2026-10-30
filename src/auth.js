import { downloadFullJsonBackup } from "./backup-core.js";
import { logActivity } from "./activity.js";
import {
  auth,
  db,
  secondaryAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "./firebase.js";

/**
 * Figures out who's signed in and what role they have.
 *
 * Super Admin is intentionally NOT stored in the `users` collection (the
 * collection director/admin list to see "all accounts") — it lives alone at
 * config/superAdmin, readable only by the matching uid. So it never shows
 * up in any user-management list, by construction, not by UI hiding.
 */
export async function resolveIdentity(user) {
  if (!user) return null;

  // 1) Am I the super admin? (a permission-denied read here just means "no")
  try {
    const saSnap = await getDoc(doc(db, "config", "superAdmin"));
    if (saSnap.exists() && saSnap.data().uid === user.uid) {
      return { uid: user.uid, role: "superAdmin", name: saSnap.data().name || "Super Admin", email: user.email };
    }
  } catch (e) {
    /* not the super admin — rules denied the read, that's expected */
  }

  // 2) Otherwise look up my profile in users/{uid}
  const uSnap = await getDoc(doc(db, "users", user.uid));
  if (!uSnap.exists()) return null;
  const profile = uSnap.data();
  if (profile.active === false) return null; // deactivated account

  return { uid: user.uid, email: user.email, ...profile };
}

/** Page guard: redirect to login unless signed in with an allowed role. */
export function guardPage(allowedRoles, onReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    const identity = await resolveIdentity(user);
    if (!identity || !allowedRoles.includes(identity.role)) {
      await signOut(auth);
      window.location.href = "index.html";
      return;
    }
    onReady(identity);
  });
}

export async function login(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  try {
    const identity = await resolveIdentity(auth.currentUser);
    await logActivity(identity, "login");
  } catch (e) {
    /* non-fatal */
  }
}

/**
 * Changes the CURRENTLY signed-in person's own password. Firebase requires
 * a recent login for this, so we re-authenticate with their current
 * password first — this is the normal, supported client-side flow (unlike
 * setting someone ELSE's password, which Firebase never allows client-side).
 */
export async function changeOwnPassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Not signed in.");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

/**
 * Entry User and Admin (internal roles 'admin'/'director') get a full
 * backup auto-downloaded the moment they log out — Super Admin does not
 * (per the person's request). Best-effort: a failed/slow backup never
 * blocks the actual sign-out.
 */
export async function logout() {
  try {
    if (auth.currentUser) {
      const identity = await resolveIdentity(auth.currentUser);
      await logActivity(identity, "logout");
      if (identity && (identity.role === "admin" || identity.role === "director")) {
        await downloadFullJsonBackup();
      }
    }
  } catch (e) {
    /* non-fatal — never block logout over a backup failure */
  }
  await signOut(auth);
  window.location.href = "index.html";
}

export async function requestPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Director/Admin creates a brand-new login for a member or admin.
 * Uses the secondary app so the CURRENT staff session is untouched.
 * Returns the new user's uid so the caller can write their users/{uid} doc.
 */
export async function createStaffOrMemberAccount(email, password) {
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const newUid = cred.user.uid;
  await signOut(secondaryAuth); // don't leave the secondary app signed in
  return newUid;
}

/** One-time bootstrap: claim super admin if nobody holds it yet. */
export async function claimSuperAdminIfVacant(name) {
  const ref = doc(db, "config", "superAdmin");
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error("একজন Super Admin ইতিমধ্যে নিবন্ধিত — তার কাছে অ্যাক্সেস চাও।");
  }
  if (!auth.currentUser) throw new Error("আগে সাইন-আপ/লগইন করো।");
  await setDoc(ref, {
    uid: auth.currentUser.uid,
    name: name || "Super Admin",
    email: auth.currentUser.email,
    createdAt: serverTimestamp(),
  });
}
