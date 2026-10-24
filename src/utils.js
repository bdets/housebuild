import { getCachedOrg } from "./org-store.js";

export function money(n) {
  const num = Number(n) || 0;
  return `${getCachedOrg().currency}${num.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function fmtDate(d) {
  if (!d) return "";
  const date = d.toDate ? d.toDate() : new Date(d);
  if (isNaN(date)) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function toast(msg, isError = false) {
  const box = el(`<div class="toast ${isError ? "toast-error" : ""}">${msg}</div>`);
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add("show"));
  setTimeout(() => {
    box.classList.remove("show");
    setTimeout(() => box.remove(), 300);
  }, 3000);
}

/**
 * Fills (or creates) a <datalist> with the unique, non-empty values seen so
 * far for one field — this is what powers "suggest as you type" on repeat
 * entries (remarks, beneficiary names, voucher descriptions, etc.) without
 * needing any extra Firestore query: it's built from data already loaded
 * on the page.
 */
export function fillDatalist(id, values) {
  let dl = document.getElementById(id);
  if (!dl) return;
  const unique = [...new Set(values.filter(Boolean))].sort();
  dl.innerHTML = unique.map((v) => `<option value="${String(v).replace(/"/g, "&quot;")}"></option>`).join("");
}

/**
 * Reads an uploaded image file, resizes it to fit within maxDim x maxDim
 * and compresses it to JPEG, returning a data: URL small enough to store
 * directly as a Firestore field (a single Firestore document is capped at
 * ~1 MiB total, so keeping the logo under roughly 150 KB leaves plenty of
 * room — no Firebase Storage bucket needed for something this small).
 */
export function resizeImageToDataUrl(file, maxDim = 320, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ফাইল পড়া যায়নি / Couldn't read the file"));
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff"; // flatten transparency onto white for JPEG
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("ছবিটা খোলা যায়নি / Couldn't open the image"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function randomPassword(len = 10) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}
