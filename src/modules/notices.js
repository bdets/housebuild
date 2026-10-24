import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "../firebase.js";
import { fmtDate, toast } from "../utils.js";
import { t } from "../i18n.js";

export async function render(root, identity) {
  root.innerHTML = `
    <h1>${t("notices")}</h1>
    <div class="panel">
      <h2>${t("newNotice")}</h2>
      <form id="noticeForm" class="form-grid">
        <div style="grid-column:1/-1"><label>${t("title")} *</label><input type="text" name="title" required /></div>
        <div style="grid-column:1/-1"><label>${t("details")} *</label><textarea name="body" rows="4" required></textarea></div>
        <div><label>${t("audience")}</label>
          <select name="audience">
            <option value="all">${t("forEveryone")}</option>
            <option value="members">${t("forMembersOnly")}</option>
            <option value="admins">${t("forStaffOnly")}</option>
          </select>
        </div>
        <div><label>${t("status")}</label>
          <select name="status">
            <option value="published">${t("publishNow")}</option>
            <option value="draft">${t("keepDraft")}</option>
          </select>
        </div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("save")}</button></div>
      </form>
    </div>
    <div class="panel"><h2>${t("allNotices")}</h2><div id="noticeList"></div></div>
  `;

  async function load() {
    const snap = await getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc")));
    const notices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const list = document.getElementById("noticeList");
    if (!notices.length) {
      list.innerHTML = `<div class="empty-state">${t("noNoticesYet")}</div>`;
      return;
    }
    list.innerHTML = notices
      .map(
        (n) => `<div class="panel" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;">
          <strong>${n.title}</strong>
          <span class="muted">${fmtDate(n.createdAt)} · ${n.status === "published" ? "✅ " + t("published") : "📝 " + t("draft")} · ${n.audience}</span>
        </div>
        <p style="margin:8px 0;">${n.body}</p>
        <div class="btn-row">
          ${
            n.status !== "published"
              ? `<button class="btn-primary" data-publish="${n.id}" style="padding:6px 14px;">${t("publish")}</button>`
              : `<button class="btn-ghost" data-unpublish="${n.id}" style="padding:6px 14px;">${t("unpublish")}</button>`
          }
          <button class="btn-danger" data-del="${n.id}" style="padding:6px 14px;">${t("delete")}</button>
        </div>
      </div>`
      )
      .join("");

    list.querySelectorAll("[data-publish]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await updateDoc(doc(db, "notices", btn.dataset.publish), { status: "published" });
        toast(t("saved"));
        load();
      })
    );
    list.querySelectorAll("[data-unpublish]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await updateDoc(doc(db, "notices", btn.dataset.unpublish), { status: "draft" });
        toast(t("saved"));
        load();
      })
    );
    list.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm(t("confirmDelete"))) return;
        await deleteDoc(doc(db, "notices", btn.dataset.del));
        toast(t("deleted"));
        load();
      })
    );
  }

  document.getElementById("noticeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addDoc(collection(db, "notices"), {
      title: fd.get("title"),
      body: fd.get("body"),
      audience: fd.get("audience"),
      status: fd.get("status"),
      createdBy: identity.uid,
      createdAt: serverTimestamp(),
    });
    toast(t("saved"));
    e.target.reset();
    load();
  });

  load();
}
