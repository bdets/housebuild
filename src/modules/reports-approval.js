import { db, collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp } from "../firebase.js";
import { fmtDate, toast } from "../utils.js";
import { t } from "../i18n.js";

const TYPE_KEY = { "income-expense": "incomeExpense", cash: "cashReport", "assets-liabilities": "assetsLiabilities" };
const STATUS_KEY = { "pending-approval": "pendingApproval", approved: "approved", rejected: "rejected", draft: "draft" };

export async function render(root, identity) {
  const canApprove = identity.role === "director" || identity.role === "superAdmin";

  root.innerHTML = `
    <h1>${t("reports")}</h1>
    <div class="panel">
      <h2>${t("submitReport")}</h2>
      <form id="reportForm" class="form-grid">
        <div><label>${t("reportType")} *</label><select name="type" required>
          ${Object.entries(TYPE_KEY).map(([k, labelKey]) => `<option value="${k}">${t(labelKey)}</option>`).join("")}
        </select></div>
        <div><label>${t("periodTitle")} *</label><input type="text" name="title" required /></div>
        <div style="grid-column:1/-1"><label>${t("summaryNote")} *</label><textarea name="summary" rows="4" required></textarea></div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("submitForApproval")}</button></div>
      </form>
    </div>
    <div class="panel"><h2>${t("allReports")}</h2><div id="reportList"></div></div>
  `;

  async function load() {
    const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
    const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const list = document.getElementById("reportList");
    if (!reports.length) {
      list.innerHTML = `<div class="empty-state">${t("noReportsYet")}</div>`;
      return;
    }
    list.innerHTML = reports
      .map(
        (r) => `<div class="panel" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;">
          <strong>${t(TYPE_KEY[r.type] || r.type)} — ${r.title}</strong>
          <span class="muted">${fmtDate(r.createdAt)} · ${t(STATUS_KEY[r.status] || r.status)}</span>
        </div>
        <p style="margin:8px 0;white-space:pre-wrap;">${r.summary}</p>
        ${
          canApprove && r.status === "pending-approval"
            ? `<div class="btn-row">
                <button class="btn-primary" data-approve="${r.id}" style="padding:6px 14px;">${t("approveBtn")}</button>
                <button class="btn-danger" data-reject="${r.id}" style="padding:6px 14px;">${t("rejectBtn")}</button>
              </div>`
            : ""
        }
      </div>`
      )
      .join("");

    list.querySelectorAll("[data-approve]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await updateDoc(doc(db, "reports", btn.dataset.approve), { status: "approved" });
        toast(t("saved"));
        load();
      })
    );
    list.querySelectorAll("[data-reject]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await updateDoc(doc(db, "reports", btn.dataset.reject), { status: "rejected" });
        toast(t("saved"));
        load();
      })
    );
  }

  document.getElementById("reportForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addDoc(collection(db, "reports"), {
      type: fd.get("type"),
      title: fd.get("title"),
      summary: fd.get("summary"),
      status: "pending-approval",
      preparedBy: identity.uid,
      createdAt: serverTimestamp(),
    });
    toast(t("saved"));
    e.target.reset();
    load();
  });

  load();
}
