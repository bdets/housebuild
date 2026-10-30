import { db, collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "../firebase.js";
import { fmtDate, toast } from "../utils.js";
import { t, getLang } from "../i18n.js";
import { logActivity } from "../activity.js";

const CATEGORY_LABEL = {
  transferbill: { bn: "ট্রান্সফার বিল", en: "Transfer Bill" },
  cashvoucher: { bn: "ক্যাশ ভাউচার", en: "Cash Voucher" },
};

/** category: 'transferbill' | 'cashvoucher' — called from admin-main.js per nav leaf. */
export async function render(root, identity, category) {
  const en = getLang() === "en";
  const canWrite = ["superAdmin", "director"].includes(identity.role) || (identity.modules || []).includes("posts");
  const label = CATEGORY_LABEL[category] ? CATEGORY_LABEL[category][en ? "en" : "bn"] : category;

  root.innerHTML = `
    <h1>${label}</h1>
    ${
      canWrite
        ? `<div class="panel">
            <h2>${t("newPost")}</h2>
            <form id="postForm" class="form-grid">
              <div style="grid-column:1/-1"><label>${t("title")} *</label><input type="text" name="title" required /></div>
              <div style="grid-column:1/-1"><label>${en ? "Description" : "বিবরণ"}</label><input type="text" name="description" /></div>
              <div style="grid-column:1/-1"><label>${t("driveLink")} *</label><input type="url" name="driveLink" placeholder="https://drive.google.com/..." required /></div>
              <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("save")}</button></div>
            </form>
          </div>`
        : ""
    }
    <div class="panel"><div id="postList"></div></div>
  `;

  async function load() {
    const snap = await getDocs(query(collection(db, "posts"), where("category", "==", category), orderBy("createdAt", "desc")));
    const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const list = document.getElementById("postList");
    if (!posts.length) {
      list.innerHTML = `<div class="empty-state">${t("noPostsYet")}</div>`;
      return;
    }
    list.innerHTML = posts
      .map(
        (p) => `<div class="panel" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;">
          <strong>${p.title}</strong>
          <span class="muted">${fmtDate(p.createdAt)}</span>
        </div>
        ${p.description ? `<p style="margin:8px 0;">${p.description}</p>` : ""}
        <div class="btn-row">
          <a href="${p.driveLink}" target="_blank" rel="noopener" class="btn-gold" style="text-decoration:none;padding:8px 16px;display:inline-block;">${t("openLink")}</a>
          ${canWrite ? `<button class="btn-danger" data-del="${p.id}" style="padding:8px 16px;">${t("delete")}</button>` : ""}
        </div>
      </div>`
      )
      .join("");

    list.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm(t("confirmDelete"))) return;
        await deleteDoc(doc(db, "posts", btn.dataset.del));
        toast(t("deleted"));
        load();
      })
    );
  }

  const postForm = document.getElementById("postForm");
  if (postForm) {
    postForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await addDoc(collection(db, "posts"), {
        category,
        title: fd.get("title"),
        description: fd.get("description") || "",
        driveLink: fd.get("driveLink"),
        createdBy: identity.uid,
        createdAt: serverTimestamp(),
      });
      logActivity(identity, "post_added", `${category}: ${fd.get("title")}`);
      toast(t("saved"));
      e.target.reset();
      load();
    });
  }

  load();
}
