import { db, collection, getDocs, doc, getDoc, setDoc, query, where } from "../firebase.js";
import { toast, resizeImageToDataUrl } from "../utils.js";
import { t, getLang } from "../i18n.js";
import { logActivity } from "../activity.js";

import { html, raw } from "../core/html.js";
// Shareholder Entry is the ONE place to start data entry from zero: it
// creates/edits plain shareholder records directly (name, family, address,
// share info, photo) with NO Firebase Auth account, NO email, NO password.
// Giving a shareholder their own login (if/when they ever want one) stays a
// separate, optional step in Users — this screen is only about the data.

async function getMembers() {
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", "member")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.slno || 0) - (b.slno || 0));
}

export async function render(root, identity) {
  const en = getLang() === "en";
  const members = await getMembers();

  root.innerHTML = html`
    <h1>${t("shareholderEntry")}</h1>
    <div class="panel">
      <div class="btn-row" style="margin-bottom:14px;">
        <button class="btn-primary" id="addNewBtn">➕ ${t("addShareholder")}</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>${t("slno")}</th><th>${t("name")}</th><th>${t("mobile")}</th>
            <th>${t("totalShare")}</th><th>${t("loginAccess")}</th><th></th>
          </tr></thead>
          <tbody id="shRows"></tbody>
        </table>
      </div>
      <p class="muted" id="emptyMsg" style="display:none;">${t("noShareholdersYet")}</p>
    </div>
    <div id="formPanel"></div>
  `;

  const tbody = document.getElementById("shRows");
  document.getElementById("emptyMsg").style.display = members.length ? "none" : "block";
  tbody.innerHTML = members
    .map(
      (m) => html`<tr>
        <td>${m.slno ?? "—"}</td>
        <td>${m.name || ""}</td>
        <td>${m.mobile || ""}</td>
        <td>${m.totalShare ?? "—"}</td>
        <td>${m.hasLogin ? "🟢 " + t("loginYes") : "⚪ " + t("loginNo")}</td>
        <td><button class="btn-ghost" data-edit="${m.id}" style="padding:4px 10px;">${t("edit")}</button></td>
      </tr>`
    )
    .join("");

  function openForm(member) {
    const formPanel = document.getElementById("formPanel");
    const isNew = !member;
    const m = member || {};

    formPanel.innerHTML = html`
      <div class="panel">
        <div class="btn-row" style="margin-bottom:10px;">
          <button class="btn-ghost" id="backBtn" style="padding:4px 10px;">${t("backToList")}</button>
        </div>
        <h2>${isNew ? t("addShareholder") : m.name || ""}</h2>
        <form id="shForm" class="form-grid">
          <div style="grid-column:1/-1;display:flex;align-items:center;gap:16px;">
            <img id="photoPreview" src="${m.photoDataUrl || ""}" alt="photo"
                 style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--line);${
                   m.photoDataUrl ? "" : "display:none;"
                 }" />
            <div style="flex:1;">
              <label>${t("photo")}</label>
              <input type="file" id="photoInput" accept="image/*" />
            </div>
          </div>
          <div><label>${t("slno")}</label><input type="number" name="slno" value="${m.slno ?? ""}" /></div>
          <div><label>${t("idNo")}</label><input type="text" name="idNo" value="${m.idNo || ""}" /></div>
          <div><label>${t("totalShare")}</label><input type="number" step="0.5" name="totalShare" value="${
      m.totalShare ?? 1
    }" /></div>
          <div><label>${t("name")} *</label><input type="text" name="name" value="${m.name || ""}" required /></div>
          <div><label>${t("mobile")}</label><input type="text" name="mobile" value="${m.mobile || ""}" /></div>
          <div><label>${t("whatsapp")}</label><input type="text" name="whatsapp" value="${m.whatsapp || ""}" /></div>
          <div><label>${t("fatherName")}</label><input type="text" name="fatherName" value="${
      m.fatherName || ""
    }" /></div>
          <div><label>${t("motherName")}</label><input type="text" name="motherName" value="${
      m.motherName || ""
    }" /></div>
          <div><label>${t("spouseName")}</label><input type="text" name="spouseName" value="${
      m.spouseName || ""
    }" /></div>
          <div style="grid-column:1/-1"><label>${t("currentAddress")}</label><input type="text" name="currentAddress" value="${
      m.currentAddress || ""
    }" /></div>
          <div style="grid-column:1/-1"><label>${t("permanentAddress")}</label><input type="text" name="permanentAddress" value="${
      m.permanentAddress || ""
    }" /></div>
          <div style="grid-column:1/-1" class="btn-row">
            <button type="submit" class="btn-primary">${t("save")}</button>
          </div>
          ${
            isNew
              ? html`<p class="muted" style="grid-column:1/-1;">${
                  en
                    ? "This creates a plain shareholder record — no login account. You can give them a login later from Users, if they ever need one."
                    : "এটা শুধু শেয়ার হোল্ডারের তথ্য সংরক্ষণ করবে — কোনো লগইন অ্যাকাউন্ট তৈরি হবে না। পরে দরকার হলে Users থেকে লগইন দেওয়া যাবে।"
                }</p>`
              : ""
          }
        </form>
      </div>
    `;

    document.getElementById("backBtn").addEventListener("click", () => {
      document.getElementById("formPanel").innerHTML = "";
    });

    let pendingPhoto = m.photoDataUrl || null;
    document.getElementById("photoInput").addEventListener("change", async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      try {
        pendingPhoto = await resizeImageToDataUrl(file, 400, 0.85);
        const preview = document.getElementById("photoPreview");
        preview.src = pendingPhoto;
        preview.style.display = "block";
      } catch (err) {
        toast(err.message || (en ? "Couldn't process the image." : "ছবিটা প্রসেস করা যায়নি।"), true);
      }
    });

    document.getElementById("shForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const data = {
        name: fd.get("name"),
        slno: fd.get("slno") ? Number(fd.get("slno")) : null,
        idNo: fd.get("idNo") || "",
        totalShare: Number(fd.get("totalShare")) || 0,
        mobile: fd.get("mobile") || "",
        whatsapp: fd.get("whatsapp") || "",
        fatherName: fd.get("fatherName") || "",
        motherName: fd.get("motherName") || "",
        spouseName: fd.get("spouseName") || "",
        currentAddress: fd.get("currentAddress") || "",
        permanentAddress: fd.get("permanentAddress") || "",
        photoDataUrl: pendingPhoto,
      };
      try {
        if (isNew) {
          data.role = "member";
          data.active = true;
          data.hasLogin = false;
          data.modules = [];
          data.createdAt = new Date().toISOString();
          const ref = doc(collection(db, "users"));
          await setDoc(ref, data);
          logActivity(identity, "shareholder_created", data.name);
        } else {
          await setDoc(doc(db, "users", member.id), data, { merge: true });
          logActivity(identity, "shareholder_profile_updated", data.name);
        }
        toast(t("shareholderSaved"));
        document.getElementById("formPanel").innerHTML = "";
        render(root, identity); // refresh the list
      } catch (err) {
        toast(err.message || (en ? "Failed." : "ব্যর্থ হয়েছে।"), true);
      }
    });

    formPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document.getElementById("addNewBtn").addEventListener("click", () => openForm(null));
  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const snap = await getDoc(doc(db, "users", btn.dataset.edit));
      if (snap.exists()) openForm({ id: snap.id, ...snap.data() });
    });
  });
}
