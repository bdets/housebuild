// ======================================================================
// void.js — আর্থিক রেকর্ড বাতিল (D-09): মোছা নয়, কারণসহ status='void'
// ======================================================================
import { db, doc, updateDoc, serverTimestamp, auth } from "./firebase.js";
import { askVoidReason } from "./modal.js";
import { toast } from "./utils.js";
import { t } from "./i18n.js";
import { logActivity } from "./activity.js";
import { resolveIdentity } from "./auth.js";

/**
 * @param {string} collectionName deposits | costs | vouchers | cheques
 * @param {string} id             document id
 * @param {string} label          লগে যাবে, যেমন "রহিম 5000"
 * @returns {Promise<boolean>}    বাতিল হলে true
 */
export async function voidRecord(collectionName, id, label = "") {
  const reason = await askVoidReason({
    title: t("voidTitle"),
    message: label,
    label: t("voidReasonLabel"),
    yesLabel: t("voidAction"),
    noLabel: t("cancel"),
  });
  if (!reason) return false;

  const uid = auth.currentUser.uid;
  await updateDoc(doc(db, collectionName, id), {
    status: "void",
    voidedAt: serverTimestamp(),
    voidedBy: uid,
    voidReason: reason,
  });
  try {
    const identity = await resolveIdentity(auth.currentUser);
    if (identity) logActivity(identity, `void_${collectionName}`, `${label} | ${reason}`);
  } catch (e) {
    /* লগ ব্যর্থ হলেও বাতিল সম্পন্ন */
  }
  toast(t("voided"));
  return true;
}
