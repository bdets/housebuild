import { db, auth, createUserWithEmailAndPassword, onAuthStateChanged, signOut, doc, getDoc } from "./firebase.js";
import { getOrg } from "./org-store.js";
import { login, requestPasswordReset, claimSuperAdminIfVacant, resolveIdentity } from "./auth.js";
import { toast } from "./utils.js";
import { t, getLang, setLang } from "./i18n.js";

function relabelLogin() {
  document.querySelectorAll("[data-label-key]").forEach((el) => {
    el.textContent = t(el.dataset.labelKey);
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === getLang());
  });
}

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    setLang(btn.dataset.lang);
    relabelLogin();
  });
});
relabelLogin();

getOrg().then((org) => {
  document.getElementById("orgName").textContent = org.name;
  document.getElementById("orgAddress").textContent = org.address;
  if (org.logoDataUrl) {
    const logo = document.getElementById("orgLogo");
    logo.src = org.logoDataUrl;
    logo.style.display = "block";
  }
});

// show an expiry warning if superAdmin set one (config/* is public-read)
getDoc(doc(db, "config", "appMeta"))
  .then((snap) => {
    if (!snap.exists() || !snap.data().expiryDate) return;
    const expiry = new Date(snap.data().expiryDate);
    if (expiry < new Date()) {
      const el = document.getElementById("expiryNotice");
      el.textContent =
        getLang() === "en"
          ? "⚠️ This app's set expiry date has passed — contact the Super Admin."
          : "⚠️ এই অ্যাপের নির্ধারিত মেয়াদ শেষ হয়ে গেছে — Super Admin-এর সাথে যোগাযোগ করুন।";
      el.style.display = "block";
    }
  })
  .catch(() => {});

// If already signed in with a valid role, skip straight to the right page.
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const identity = await resolveIdentity(user);
  if (!identity) return;
  window.location.href = identity.role === "member" ? "member.html" : "admin.html";
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await login(fd.get("email"), fd.get("password"));
    // onAuthStateChanged above will redirect once the role is resolved
  } catch (err) {
    toast(getLang() === "en" ? "Login failed — check email/password." : "লগইন ব্যর্থ — ইমেইল/পাসওয়ার্ড চেক করুন।", true);
  }
});

document.getElementById("forgotLink").addEventListener("click", async (ev) => {
  ev.preventDefault();
  const email = prompt(getLang() === "en" ? "Enter your email — a reset link will be sent:" : "তোমার ইমেইল দাও — একটা পাসওয়ার্ড রিসেট লিংক পাঠানো হবে:");
  if (!email) return;
  try {
    await requestPasswordReset(email);
    toast(getLang() === "en" ? "Reset link sent to your email." : "রিসেট লিংক ইমেইলে পাঠানো হয়েছে।");
  } catch (err) {
    toast(getLang() === "en" ? "Couldn't send — check the email address." : "পাঠানো যায়নি — ইমেইলটা চেক করো।", true);
  }
});

document.getElementById("signupLink").addEventListener("click", async (ev) => {
  ev.preventDefault();
  const en = getLang() === "en";
  const email = prompt(en ? "Enter your email:" : "তোমার ইমেইল দাও:");
  if (!email) return;
  const password = prompt(en ? "Choose a password (6+ characters):" : "একটা পাসওয়ার্ড দাও (কমপক্ষে ৬ অক্ষর):");
  if (!password) return;
  const name = prompt(en ? "Your name:" : "তোমার নাম দাও:") || "Super Admin";
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    await claimSuperAdminIfVacant(name);
    toast(en ? "Super Admin account created!" : "Super Admin অ্যাকাউন্ট তৈরি হয়েছে!");
    window.location.href = "admin.html";
  } catch (err) {
    toast(err.message || (en ? "Sign-up failed." : "সাইন-আপ ব্যর্থ হয়েছে।"), true);
    await signOut(auth).catch(() => {});
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
