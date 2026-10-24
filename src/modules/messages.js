import { db, collection, getDocs, updateDoc, doc, query, orderBy } from "../firebase.js";
import { fmtDate, toast } from "../utils.js";
import { t, getLang } from "../i18n.js";

export async function render(root, identity) {
  const en = getLang() === "en";
  root.innerHTML = `
    <h1>${t("messages")}</h1>
    <div class="panel"><div id="msgList"></div></div>
  `;

  async function load() {
    const snap = await getDocs(query(collection(db, "messages"), orderBy("createdAt", "desc")));
    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const list = document.getElementById("msgList");
    if (!messages.length) {
      list.innerHTML = `<div class="empty-state">${t("noMessagesYet")}</div>`;
      return;
    }
    list.innerHTML = messages
      .map(
        (m) => `<div class="panel" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;">
          <strong>${m.fromName || (en ? "Member" : "সদস্য")}</strong>
          <span class="muted">${fmtDate(m.createdAt)} · ${m.status === "answered" ? "✅ " + t("answeredStatus") : "🟡 " + t("pendingStatus")}</span>
        </div>
        <p style="margin:8px 0;">${m.text}</p>
        ${(m.replies || [])
          .map((r) => `<div class="muted" style="padding-left:14px;border-left:2px solid var(--line);margin:6px 0;">↳ ${r.text}</div>`)
          .join("")}
        <form data-reply="${m.id}" class="form-grid" style="margin-top:10px;">
          <div style="grid-column:1/-1"><input type="text" name="reply" placeholder="${t("writeReply")}" /></div>
          <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary" style="padding:6px 14px;">${t("sendBtn")}</button></div>
        </form>
      </div>`
      )
      .join("");

    list.querySelectorAll("form[data-reply]").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = new FormData(e.target).get("reply");
        if (!text) return;
        const msgId = form.dataset.reply;
        const msg = messages.find((m) => m.id === msgId);
        const replies = [...(msg.replies || []), { by: identity.uid, text, createdAt: new Date().toISOString() }];
        await updateDoc(doc(db, "messages", msgId), { replies, status: "answered" });
        toast(t("saved"));
        load();
      });
    });
  }

  load();
}
