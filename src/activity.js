import { db, collection, addDoc, serverTimestamp } from "./firebase.js";

/**
 * Logs one action by the current person, UNLESS they're Super Admin (no
 * log for Super Admin, per the person's request). Best-effort and silent —
 * a logging failure should never break the actual action it's logging.
 */
export async function logActivity(identity, action, details = "") {
  if (!identity || identity.role === "superAdmin") return;
  try {
    await addDoc(collection(db, "activityLog"), {
      uid: identity.uid,
      name: identity.name || identity.email || "",
      role: identity.role,
      action,
      details,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    /* non-fatal — logging should never block the real action */
  }
}
