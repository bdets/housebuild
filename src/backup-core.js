import { db, collection, getDocs } from "./firebase.js";

export const BACKUP_COLLECTIONS = ["users", "deposits", "costs", "vouchers", "cheques", "notices", "reports", "posts", "activityLog"];

export const SHEET_NAME = {
  users: "Users",
  deposits: "Deposits",
  costs: "Costs",
  vouchers: "Vouchers",
  cheques: "Cheques",
  notices: "Notices",
  reports: "Reports",
  posts: "Posts",
  activityLog: "ActivityLog",
};

export async function fetchAllData() {
  const data = {};
  for (const name of BACKUP_COLLECTIONS) {
    const snap = await getDocs(collection(db, name));
    data[name] = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
  }
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

/** Fetches everything and downloads it as one JSON file named BH-<date>_<time>.json. */
export async function downloadFullJsonBackup() {
  const data = await fetchAllData();
  triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `${backupFileStamp()}.json`);
}
