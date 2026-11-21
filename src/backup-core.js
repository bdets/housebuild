import { db, collection, doc, getDocs, getDoc } from "./firebase.js";

// বাদ-পড়তে-পারে এমন collection: প্রতিটি আলাদাভাবে পড়া হয়; অনুমতি না থাকলে শুধু সেটি বাদ যায়।
export const BACKUP_COLLECTIONS = ["users", "deposits", "costs", "vouchers", "cheques", "notices", "reports", "posts", "messages", "activityLog"];

// কনফিগ ডকগুলো (superAdmin ডক ইচ্ছাকৃতভাবে বাদ — নিজের অনুমতিই রাখে)
export const CONFIG_DOCS = ["org", "installmentPlan", "costItems", "appMeta"];

export const SHEET_NAME = {
  users: "Users",
  deposits: "Deposits",
  costs: "Costs",
  vouchers: "Vouchers",
  cheques: "Cheques",
  notices: "Notices",
  reports: "Reports",
  posts: "Posts",
  messages: "Messages",
  activityLog: "ActivityLog",
};

/**
 * সম্পূর্ণ ব্যাকআপ-বান্ডিল। অনুমতি-বাইরের collection/doc বাদ যায় এবং `_meta.skipped`-এ লেখা থাকে,
 * যাতে ফাইল পড়লে বোঝা যায় কী নেই — নীরবে কম ডেটা যায় না।
 */
export async function fetchAllData() {
  const data = {};
  const skipped = [];

  for (const name of BACKUP_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, name));
      data[name] = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    } catch (e) {
      data[name] = [];
      skipped.push(name);
    }
  }

  const config = {};
  for (const id of CONFIG_DOCS) {
    try {
      const snap = await getDoc(doc(db, "config", id));
      if (snap.exists()) config[id] = snap.data();
    } catch (e) {
      skipped.push(`config/${id}`);
    }
  }
  data.config = config;
  data._meta = { exportedAt: new Date().toISOString(), skipped };
  return data;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/** "BH-2026-10-26_14-30-05" — used as the backup filename's base. */
export function backupFileStamp(date = new Date()) {
  return `BH-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** সম্পূর্ণ JSON ডাউনলোড; ফেরত দেয় কোন অংশ বাদ গেছে। */
export async function downloadFullJsonBackup() {
  const data = await fetchAllData();
  triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `${backupFileStamp()}.json`);
  return { skipped: data._meta.skipped };
}
