# সেটআপ গাইড (বাংলায়) — কোনো কমান্ড ছাড়াই

এই ভার্সনে আর কোনো বিল্ড-স্টেপ (npm/Vite) নেই — তোমার অন্য প্রজেক্টগুলোর মতোই সরাসরি প্লেইন HTML/CSS/JS। মানে: **GitHub-এ ফোল্ডার আপলোড করো, Firebase কনফিগ বসাও, GitHub Pages চালু করো — কোনো টার্মিনাল/কমান্ড কখনোই লাগবে না।**

---

## ধাপ ১: Firebase প্রজেক্ট তৈরি করো

1. **https://console.firebase.google.com** → **"Add project"** → নাম দাও (যেমন `darul-barakah`) → Analytics স্কিপ
2. **Build → Authentication → Get started → Email/Password → Enable**
3. **Build → Firestore Database → Create database → Location: `asia-southeast1` (Singapore) → Production mode**
4. Blaze প্ল্যান লাগবে না — এখানে কোনো Cloud Function নেই।

---

## ধাপ ২: Firestore Rules পেস্ট করো

**Firestore Database → Rules** ট্যাবে গিয়ে এই প্রজেক্টের `firestore.rules` ফাইলের পুরো কনটেন্ট পেস্ট করে **Publish** করো।

---

## ধাপ ৩: Firebase SDK কনফিগ সংগ্রহ করো

**⚙️ Project settings → General → Your apps → `</>` (Web) → Register app** — `firebaseConfig = {...}` অবজেক্টটা কপি করে রাখো।

---

## ধাপ ৪: কনফিগ ফাইলে বসাও

এই zip এক্সট্র্যাক্ট করে `src/config.js` ফাইলটা খোলো (যেকোনো টেক্সট এডিটরে, অথবা GitHub-এ আপলোডের পরেও সেখান থেকে এডিট করা যায়)। এরকম একটা অংশ পাবে:

```js
export const FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};
```

প্রতিটা `"REPLACE_ME..."` মুছে ধাপ ৩-এর আসল মান বসাও। (একই ফাইলে `DEFAULT_ORG`-এ চাইলে তোমার প্রতিষ্ঠানের নাম/ঠিকানাও বদলাতে পারো — যদিও অ্যাপ চালু হওয়ার পর Settings থেকেও এটা বদলানো যাবে।)

**এই ফাইলে থাকা মানগুলো গোপন তথ্য না** — এগুলো শুধু তোমার Firebase প্রজেক্টকে চিহ্নিত করে, আসল নিরাপত্তা আসে Firestore Rules আর লগইন থেকে। তাই এটা GitHub-এ সরাসরি আপলোড করাই নিরাপদ।

---

## ধাপ ৫: GitHub-এ আপলোড করো

1. GitHub-এ একটা **Public** রিপোজিটরি বানাও (যেমন `darul-barakah-app`)

   **কেন Public নিরাপদ:** GitHub Pages ফ্রি প্ল্যানে Private রিপো দিয়ে আসলে কাজই করে না (Pro লাগে), আর Pro নিয়ে Private রাখলেও পাবলিশ হওয়া ওয়েবসাইটটা তখনও সবার জন্য খোলাই থাকে — শুধু GitHub-এর কোড-পেজটা লুকানো থাকে। এই অ্যাপের আসল ডেটা-সুরক্ষা আসে Firebase Authentication (লগইন ছাড়া কেউ ঢুকতে পারবে না) আর Firestore Rules (রোল অনুযায়ী ডেটা সীমাবদ্ধ) থেকে — রিপো Public না Private তার সাথে ডেটা-সুরক্ষার কোনো সম্পর্ক নেই। `src/config.js`-এর Firebase কনফিগও গোপন তথ্য না (ফাইলের ভেতরেই এর ব্যাখ্যা আছে)।
2. **"uploading an existing file"** → এই ফোল্ডারের **সব ফাইল ও ফোল্ডার** (`.gitignore`, `README.md`, `index.html`, `admin.html`, `member.html`, `firestore.rules`, `manifest.json`, `sw.js`, `icons/`, `src/` — সব) টেনে এনে আপলোড করো → **Commit changes**

---

## ধাপ ৬: GitHub Pages চালু করো

1. রিপোজিটরিতে **Settings → Pages**
2. **Source: Deploy from a branch**
3. **Branch: `main`**, ফোল্ডার: **`/ (root)`** → **Save**
4. ১-২ মিনিট পর উপরে একটা লিংক দেখাবে: `https://তোমার-ইউজারনেম.github.io/darul-barakah-app/` — এটাই তোমার লাইভ অ্যাপ

---

## ধাপ ৭: Firebase-এ এই ডোমেইনকে অনুমোদন দাও

GitHub Pages নিজে Firebase Hosting না, তাই এই একটা ধাপ ম্যানুয়ালি করতে হয়:

1. Firebase কনসোল → **Authentication → Settings → Authorized domains**
2. **"Add domain"** → `তোমার-ইউজারনেম.github.io` যোগ করো (শুধু ডোমেইন অংশটুকু, পুরো লিংক না)

(এটা না করলে লগইন কাজ করবে না — Firebase শুধু অনুমোদিত ডোমেইন থেকে Auth রিকোয়েস্ট গ্রহণ করে।)

---

## ধাপ ৮: নিজের Super Admin অ্যাকাউন্ট বানাও

লাইভ লিংক খোলো → **"Super Admin হিসেবে সাইন-আপ করুন"** → ইমেইল/পাসওয়ার্ড/নাম দাও। তুমিই এখন একমাত্র Super Admin।

---

## ধাপ ৯: Director, Admin, সদস্য যোগ করো

Users ট্যাব থেকে — Admin বানানোর সময় মডিউল টিক দাও, সদস্যের জন্য নাম/ইমেইল/মোবাইল/শেয়ার দাও। প্রতিবার তৈরির পর পপ-আপে ইমেইল+পাসওয়ার্ড দেখাবে — সংশ্লিষ্ট ব্যক্তিকে পাঠিয়ে দাও।

---

## পরে কোড পরিবর্তন করলে

**এখানেই সবচেয়ে বড় সুবিধা — কোনো কমান্ড লাগবে না।** GitHub-এ গিয়ে যে ফাইলটা বদলাতে চাও, pencil ✏️ আইকনে ক্লিক করে ব্রাউজারেই এডিট করো, **Commit changes** চাপো — GitHub Pages ১-২ মিনিটে নিজে থেকেই আপডেট হয়ে যাবে। অথবা নতুন কোনো ফাইল আপলোড করতে চাইলে আগের মতোই "Add file → Upload files"।

`firestore.rules` পরিবর্তন করলে সেটা আলাদাভাবে Firebase কনসোলের Rules ট্যাবে গিয়ে আবার পেস্ট করে Publish করতে হবে — এটা GitHub-এর সাথে যুক্ত না।

---

## সাধারণ সমস্যা ও সমাধান

| সমস্যা | সমাধান |
|---|---|
| লগইন করলে "auth/unauthorized-domain" এরর | ধাপ ৭ করা হয়নি — GitHub Pages-এর ডোমেইন Firebase-এ Authorized domains-এ যোগ করো |
| "Missing or insufficient permissions" | Firestore Rules পেস্ট/Publish করা হয়নি (ধাপ ২), অথবা ভুল রোলে লগইন করা আছে |
| পেজ খুললে সাদা/ফাঁকা স্ক্রিন, কনসোলে "REPLACE_ME" সংক্রান্ত এরর | `src/config.js`-এ ধাপ ৩-এর আসল মান বসানো হয়নি |
| কোনো লিস্ট/রিপোর্ট খালি, কনসোলে ইনডেক্স-সংক্রান্ত এরর | এররে যে লিংক দেখাবে সেখানে ক্লিক করো, ইনডেক্স তৈরি হতে ১-২ মিনিট লাগে |
| PDF/Excel বাটনে কিছু হচ্ছে না | ইন্টারনেট সংযোগ চেক করো (jsPDF/SheetJS CDN থেকে লোড হয়) |
| GitHub Pages-এ পেজ আপডেট দেখাচ্ছে না | ১-২ মিনিট অপেক্ষা করো, তারপর ব্রাউজারে হার্ড-রিফ্রেশ (Ctrl+Shift+R) দাও — পুরনো ক্যাশ থেকে যেতে পারে |
