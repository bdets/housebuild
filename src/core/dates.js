// ======================================================================
// core/dates.js — Asia/Dhaka-সচেতন তারিখ সহায়ক (Phase 1A, C-08 সমাধান)
// ব্যবসায়িক তারিখ = 'YYYY-MM-DD' স্ট্রিং (ঢাকার ক্যালেন্ডার তারিখ)।
// ======================================================================

const TZ = "Asia/Dhaka";
const fmtYMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
});

// যেকোনো মুহূর্তের ঢাকা-তারিখ 'YYYY-MM-DD'
export function dhakaDateOf(date = new Date()) {
  return fmtYMD.format(date); // en-CA → 2026-11-19
}

export function todayDhaka() {
  return dhakaDateOf(new Date());
}

// 'YYYY-MM-DD' → { y, m, d } (সংখ্যা)। অবৈধ হলে null।
export function parseYMD(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

// পূর্ণ মাস গণনা: from-তারিখ থেকে asOf পর্যন্ত কত পূর্ণ মাস পেরিয়েছে।
// সম্পূর্ণ ক্যালেন্ডার-সংখ্যা দিয়ে — টাইমজোন/UTC ঝামেলা নেই।
export function wholeMonthsBetween(fromYMD, asOfYMD) {
  const a = parseYMD(fromYMD), b = parseYMD(asOfYMD);
  if (!a || !b) return 0;
  if (b.y < a.y || (b.y === a.y && (b.m < a.m || (b.m === a.m && b.d < a.d)))) return 0;
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) months -= 1;
  return Math.max(0, months);
}
