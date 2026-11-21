// ======================================================================
// core/html.js — নিরাপদ HTML তৈরির সহায়ক (Phase 1A, XSS প্রতিরোধ)
//
// ব্যবহার:
//   el.innerHTML = html`<td>${d.remarks}</td>`;       // ${} সব স্বয়ংক্রিয় escape হয়
//   html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`   // array-ও চলে (.join লাগে না)
//   raw("<b>বিশ্বস্ত</b>")                              // শুধু নিজের লেখা স্থির HTML-এর জন্য
//
// নিয়ম: Firestore/ব্যবহারকারীর লেখা কোনো মান কখনো raw() বা সাধারণ
//       template literal দিয়ে innerHTML-এ বসানো যাবে না।
// ======================================================================

// SafeHtml = "ইতিমধ্যে নিরাপদ" চিহ্নিত স্ট্রিং। String-এর সাব-ক্লাস, তাই
// .trim(), +, innerHTML = ... সবকিছু আগের মতোই কাজ করে।
export class SafeHtml extends String {}

const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };

export function esc(v) {
  if (v instanceof SafeHtml) return v.toString();
  if (v === null || v === undefined || v === false) return "";
  return String(v).replace(/[&<>"'`]/g, (c) => MAP[c]);
}

export function raw(s) {
  return new SafeHtml(String(s ?? ""));
}

function part(v) {
  if (Array.isArray(v)) return v.map(part).join("");
  return esc(v);
}

// Tagged template: স্থির অংশ অপরিবর্তিত, ${} অংশ escape (SafeHtml ও array বাদে)।
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += part(vals[i]) + strings[i + 1];
  return new SafeHtml(out);
}

// শুধু https লিংক গ্রহণযোগ্য। javascript:, data:, http: ইত্যাদি → null।
export function safeUrl(u) {
  try {
    const url = new URL(String(u || "").trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

// href-এ বসানোর জন্য: অবৈধ হলে "#" (ক্লিকে কিছু হয় না)।
export function hrefOrHash(u) {
  return safeUrl(u) || "#";
}

// লোগো/ছবির data: URL — শুধু base64 ছবি গ্রহণযোগ্য, নইলে খালি।
export function safeImgSrc(u) {
  const s = String(u || "");
  return /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(s) ? s : "";
}
