import { db, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "./firebase.js";
import { getOrg } from "./org-store.js";
import { guardPage, logout } from "./auth.js";
import { computeOwnMemberSummary } from "./reports.js";
import { money, fmtDate, toast } from "./utils.js";
import { exportMemberStatementPDF } from "./print.js";
import { t, getLang, setLang } from "./i18n.js";

guardPage(["member"], async (identity) => {
  const root = document.getElementById("root");
  const [org, summary] = await Promise.all([getOrg(), computeOwnMemberSummary(identity.uid)]);

  let reports = [];
  try {
    const rSnap = await getDocs(query(collection(db, "reports"), where("status", "==", "approved"), orderBy("createdAt", "desc")));
    reports = rSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    /* composite index may still be building right after first deploy */
  }

  let notices = [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "notices"),
        where("status", "==", "published"),
        where("audience", "in", ["all", "members"]),
        orderBy("createdAt", "desc")
      )
    );
    notices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    /* composite index may still be building right after first deploy */
  }

  function paint() {
    const en = getLang() === "en";
    root.innerHTML = `
      <div class="btn-row" style="margin-bottom:14px;">
        <button type="button" class="btn-ghost lang-btn" data-lang="bn" style="padding:4px 10px;flex:1;">বাংলা</button>
        <button type="button" class="btn-ghost lang-btn" data-lang="en" style="padding:4px 10px;flex:1;">English</button>
      </div>
      ${org.logoDataUrl ? `<img src="${org.logoDataUrl}" alt="logo" style="width:56px;height:56px;object-fit:cover;border-radius:10px;margin-bottom:8px;" />` : ""}
      <h1>${org.name}</h1>
      <p class="muted">${org.address}</p>

      <div class="panel">
        <h2>${en ? "Welcome" : "আসসালামু আলাইকুম"}, ${identity.name}</h2>
        <div class="cards" style="margin-top:14px;">
          <div class="card"><div class="label">${t("share")}</div><div class="value">${summary.share ?? "—"}</div></div>
          <div class="card"><div class="label">${t("totalDeposit")}</div><div class="value">${money(summary.deposit)}</div></div>
          <div class="card"><div class="label">${t("due")}</div><div class="value ${summary.due > 0 ? "due" : "ok"}">${money(summary.due)}</div></div>
        </div>
        <div class="btn-row"><button id="downloadStatementBtn" class="btn-gold">${en ? "Download Statement (PDF)" : "স্টেটমেন্ট ডাউনলোড (PDF)"}</button></div>
      </div>

      ${
        reports.length
          ? `<div class="panel"><h2>${en ? "Approved Reports" : "অনুমোদিত রিপোর্ট"}</h2>${reports
              .map(
                (r) => `<div style="margin-bottom:12px;border-bottom:1px solid var(--line);padding-bottom:10px;">
                <strong>${r.title}</strong> <span class="muted">· ${fmtDate(r.createdAt)}</span>
                <p style="margin:6px 0 0;white-space:pre-wrap;">${r.summary}</p>
              </div>`
              )
              .join("")}</div>`
          : ""
      }

      ${
        notices.length
          ? `<div class="panel"><h2>${t("notices")}</h2>${notices
              .map(
                (n) => `<div style="margin-bottom:12px;border-bottom:1px solid var(--line);padding-bottom:10px;">
                <strong>${n.title}</strong> <span class="muted">· ${fmtDate(n.createdAt)}</span>
                <p style="margin:6px 0 0;">${n.body}</p>
              </div>`
              )
              .join("")}</div>`
          : ""
      }

      <div class="panel">
        <h2>${en ? "Send a message" : "বার্তা পাঠান"}</h2>
        <form id="msgForm" class="form-grid">
          <div style="grid-column:1/-1"><textarea name="text" rows="3" placeholder="${en ? "Write your message..." : "আপনার বার্তা লিখুন..."}" required></textarea></div>
          <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${en ? "Send" : "পাঠান"}</button></div>
        </form>
      </div>

      <button class="btn-ghost" id="logoutBtn">${t("logout")}</button>
    `;

    root.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === getLang());
      btn.addEventListener("click", () => {
        setLang(btn.dataset.lang);
        paint();
      });
    });

    document.getElementById("logoutBtn").addEventListener("click", logout);

    document.getElementById("downloadStatementBtn").addEventListener("click", () => {
      toast(en ? "Preparing statement..." : "স্টেটমেন্ট তৈরি হচ্ছে...");
      exportMemberStatementPDF({
        member: { name: identity.name, totalShare: summary.share },
        deposits: summary.deposits,
        summary,
      });
    });

    document.getElementById("msgForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = new FormData(e.target).get("text");
      await addDoc(collection(db, "messages"), {
        fromUid: identity.uid,
        fromName: identity.name,
        text,
        status: "open",
        replies: [],
        createdAt: serverTimestamp(),
      });
      toast(en ? "Message sent." : "বার্তা পাঠানো হয়েছে।");
      e.target.reset();
    });
  }

  paint();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
