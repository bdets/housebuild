import { db, collection, getDocs, doc, getDoc, setDoc, query, where } from "../firebase.js";
import { toast, resizeImageToDataUrl } from "../utils.js";
import { t, getLang } from "../i18n.js";
import { logActivity } from "../activity.js";

export async function render(root, identity) {
  const en = getLang() === "en";
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", "member")));
  const members = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.slno || 0) - (b.slno || 0));

  root.innerHTML = `
    <h1>${t("shareholderEntry")}</h1>
    <div class="panel">
      <div class="form-grid" style="margin-bottom:14px;max-width:420px;">
        <div><label>${t("member")}</label>
          <select id="memberPicker">
            <option value="">${t("selectShareholder")}</option>
            ${members.map((m) => `<option value="${m.id}">${m.slno ?? ""}. ${m.name}</option>`).join("")}
          </select>
        </div>
      </div>
      <div id="formArea" class="muted">${en ? "Pick a shareholder above to edit their details." : "বিস্তারিত এডিট করতে উপরে একজন শেয়ার হোল্ডার বেছে নাও।"}</div>
    </div>
  `;

  document.getElementById("memberPicker").addEventListener("change", async (e) => {
    const memberId = e.target.value;
    const formArea = document.getElementById("formArea");
    if (!memberId) {
      formArea.innerHTML = `<div class="muted">${en ? "Pick a shareholder above to edit their details." : "বিস্তারিত এডিট করতে উপরে একজন শেয়ার হোল্ডার বেছে নাও।"}</div>`;
      return;
    }
    const snap2 = await getDoc(doc(db, "users", memberId));
    const m = snap2.exists() ? snap2.data() : {};

    formArea.innerHTML = `
      <form id="shForm" class="form-grid">
        <div style="grid-column:1/-1;display:flex;align-items:center;gap:16px;">
          <img id="photoPreview" src="${m.photoDataUrl || ""}" alt="photo"
               style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--line);${m.photoDataUrl ? "" : "display:none;"}" />
          <div style="flex:1;">
            <label>${t("photo")}</label>
            <input type="file" id="photoInput" accept="image/*" />
          </div>
        </div>
        <div><label>${t("name")}</label><input type="text" name="name" value="${m.name || ""}" /></div>
        <div><label>${t("mobile")}</label><input type="text" name="mobile" value="${m.mobile || ""}" /></div>
        <div><label>${t("whatsapp")}</label><input type="text" name="whatsapp" value="${m.whatsapp || ""}" /></div>
        <div><label>${t("fatherName")}</label><input type="text" name="fatherName" value="${m.fatherName || ""}" /></div>
        <div><label>${t("motherName")}</label><input type="text" name="motherName" value="${m.motherName || ""}" /></div>
        <div><label>${t("spouseName")}</label><input type="text" name="spouseName" value="${m.spouseName || ""}" /></div>
        <div style="grid-column:1/-1"><label>${t("currentAddress")}</label><input type="text" name="currentAddress" value="${m.currentAddress || ""}" /></div>
        <div style="grid-column:1/-1"><label>${t("permanentAddress")}</label><input type="text" name="permanentAddress" value="${m.permanentAddress || ""}" /></div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("save")}</button></div>
      </form>
    `;

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
      await setDoc(
        doc(db, "users", memberId),
        {
          name: fd.get("name"),
          mobile: fd.get("mobile") || "",
          whatsapp: fd.get("whatsapp") || "",
          fatherName: fd.get("fatherName") || "",
          motherName: fd.get("motherName") || "",
          spouseName: fd.get("spouseName") || "",
          currentAddress: fd.get("currentAddress") || "",
          permanentAddress: fd.get("permanentAddress") || "",
          photoDataUrl: pendingPhoto,
        },
        { merge: true }
      );
      logActivity(identity, "shareholder_profile_updated", fd.get("name"));
      toast(t("saved"));
    });
  });
}
