import { db, doc, getDoc, setDoc } from "../firebase.js";
import { toast, resizeImageToDataUrl } from "../utils.js";
import { getOrg, invalidateOrg } from "../org-store.js";
import { updateShellBrand } from "../ui-shell.js";
import { t, getLang } from "../i18n.js";

export async function render(root, identity) {
  const en = getLang() === "en";
  const org = await getOrg();

  let expirySection = "";
  if (identity.role === "superAdmin") {
    const expirySnap = await getDoc(doc(db, "config", "appMeta"));
    const expiry = expirySnap.exists() ? expirySnap.data().expiryDate || "" : "";
    expirySection = `
      <div class="panel">
        <h2>${en ? "App Expiry (Super Admin only)" : "অ্যাপের মেয়াদ (শুধু Super Admin)"}</h2>
        <p class="muted">${
          en
            ? "Setting a date shows a warning on the login screen after that date. To actually cut access, deactivate accounts from the Users tab."
            : "একটা তারিখ সেট করলে সেই তারিখের পর অ্যাপের লগইন স্ক্রিনে একটা সতর্কতা দেখাবে। সত্যিকারভাবে এক্সেস বন্ধ করতে Users ট্যাব থেকে প্রতিটা অ্যাকাউন্ট নিষ্ক্রিয় করতে হবে।"
        }</p>
        <form id="expiryForm" class="form-grid">
          <div><label>${en ? "Expiry date" : "মেয়াদ শেষের তারিখ"}</label><input type="date" name="expiryDate" value="${expiry}" /></div>
          <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-gold">${t("save")}</button></div>
        </form>
      </div>`;
  }

  root.innerHTML = `
    <h1>${t("settings")}</h1>
    <div class="panel">
      <h2>${en ? "Organization Info" : "সংগঠনের তথ্য"}</h2>
      <p class="muted">${
        en
          ? "Changes here apply everywhere in the app immediately in this session (sidebar, login page, PDFs/receipts)."
          : "এখানে পরিবর্তন করলে এই সেশনে সাথে সাথে অ্যাপের সব জায়গায় (সাইডবার, লগইন পেজ, PDF/রিসিট) প্রতিফলিত হবে।"
      }</p>
      <form id="orgForm" class="form-grid">
        <div style="grid-column:1/-1;display:flex;align-items:center;gap:16px;">
          <img id="logoPreview" src="${org.logoDataUrl || ""}" alt="logo"
               style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--line);${org.logoDataUrl ? "" : "display:none;"}" />
          <div style="flex:1;">
            <label>${en ? "Organization Logo" : "প্রতিষ্ঠানের লোগো"}</label>
            <input type="file" id="logoInput" accept="image/*" />
            <p class="muted" style="margin:4px 0 0;">${en ? "Square image works best — it's auto-resized." : "চৌকোনা ছবি সবচেয়ে ভালো দেখাবে — স্বয়ংক্রিয়ভাবে রিসাইজ হবে।"}</p>
          </div>
        </div>
        <div><label>${en ? "Name" : "নাম"}</label><input type="text" name="name" value="${org.name || ""}" /></div>
        <div><label>${en ? "Tagline" : "ট্যাগলাইন"}</label><input type="text" name="tagline" value="${org.tagline || ""}" /></div>
        <div style="grid-column:1/-1"><label>${en ? "Address" : "ঠিকানা"}</label><input type="text" name="address" value="${org.address || ""}" /></div>
        <div><label>${en ? "Currency symbol" : "মুদ্রা চিহ্ন"}</label><input type="text" name="currency" value="${org.currency || "৳"}" /></div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("save")}</button></div>
      </form>
    </div>
    ${expirySection}
  `;

  let pendingLogoDataUrl = org.logoDataUrl || null;

  document.getElementById("logoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      pendingLogoDataUrl = await resizeImageToDataUrl(file);
      const preview = document.getElementById("logoPreview");
      preview.src = pendingLogoDataUrl;
      preview.style.display = "block";
    } catch (err) {
      toast(err.message || (en ? "Couldn't process the image." : "ছবিটা প্রসেস করা যায়নি।"), true);
    }
  });

  document.getElementById("orgForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
      name: fd.get("name"),
      tagline: fd.get("tagline"),
      address: fd.get("address"),
      currency: fd.get("currency"),
      logoDataUrl: pendingLogoDataUrl || null,
    };
    await setDoc(doc(db, "config", "org"), updated);

    invalidateOrg();
    const fresh = await getOrg(true);
    updateShellBrand(fresh);

    toast(
      en
        ? "Saved — updated now in this session; others will see it on their next login/refresh."
        : "সংরক্ষণ করা হয়েছে — এই সেশনে এখনই আপডেট হয়েছে। অন্যরা পরের লগইনে/রিফ্রেশে দেখবে।"
    );
  });

  const expiryForm = document.getElementById("expiryForm");
  if (expiryForm) {
    expiryForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await setDoc(doc(db, "config", "appMeta"), { expiryDate: fd.get("expiryDate") || null }, { merge: true });
      toast(t("saved"));
    });
  }
}
