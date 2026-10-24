import { db, collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "../firebase.js";
import { money, fmtDate, todayISO, toast, fillDatalist } from "../utils.js";
import { exportVoucherPDF } from "../print.js";
import { t } from "../i18n.js";

export async function render(root, identity) {
  root.innerHTML = `
    <h1>${t("vouchers")}</h1>
    <div class="panel">
      <h2>${t("newVoucher")}</h2>
      <form id="voucherForm" class="form-grid">
        <div><label>${t("voucherNo")} *</label><input type="text" name="voucherNo" required /></div>
        <div><label>${t("date")} *</label><input type="date" name="date" value="${todayISO()}" required /></div>
        <div style="grid-column:1/-1"><label>${t("description")} *</label>
          <input type="text" name="description" list="voucherDescSuggestions" autocomplete="off" required />
          <datalist id="voucherDescSuggestions"></datalist>
        </div>
        <div><label>${t("amount")} (৳) *</label><input type="number" name="amount" min="0" step="1" required /></div>
        <div><label>${t("chequeNo")}</label><input type="text" name="chequeNo" /></div>
        <div style="grid-column:1/-1"><label>${t("remarks")}</label>
          <input type="text" name="remarks" list="voucherRemarksSuggestions" autocomplete="off" />
          <datalist id="voucherRemarksSuggestions"></datalist>
        </div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("submit")}</button></div>
      </form>
    </div>
    <div class="panel">
      <h2>${t("allVouchers")}</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("voucherNo")}</th><th>${t("date")}</th><th>${t("description")}</th><th>${t("chequeNo")}</th><th class="num">${t("amount")}</th><th></th></tr></thead>
        <tbody id="voucherRows"></tbody>
      </table></div>
      <div id="voucherEmpty" class="empty-state" style="display:none;">${t("noVouchersYet")}</div>
    </div>
    <div class="panel">
      <h2>${t("chequeRegister")}</h2>
      <form id="chequeForm" class="form-grid">
        <div><label>${t("chequeNo")} *</label><input type="text" name="chequeNo" required /></div>
        <div><label>${t("date")} *</label><input type="date" name="date" value="${todayISO()}" required /></div>
        <div><label>${t("amount")} (৳) *</label><input type="number" name="amount" min="0" step="1" required /></div>
        <div><label>${t("relatedVoucherNo")}</label><input type="text" name="voucherNo" /></div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-gold">${t("addCheque")}</button></div>
      </form>
      <div class="table-wrap" style="margin-top:14px;"><table>
        <thead><tr><th>${t("chequeNo")}</th><th>${t("date")}</th><th class="num">${t("amount")}</th><th>${t("voucherNo")}</th><th></th></tr></thead>
        <tbody id="chequeRows"></tbody>
      </table></div>
      <div id="chequeEmpty" class="empty-state" style="display:none;">${t("noChequesYet")}</div>
    </div>
  `;

  let allVouchers = [];
  async function loadVouchers() {
    const snap = await getDocs(query(collection(db, "vouchers"), orderBy("date", "desc")));
    allVouchers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    fillDatalist("voucherDescSuggestions", allVouchers.map((v) => v.description));
    fillDatalist("voucherRemarksSuggestions", allVouchers.map((v) => v.remarks));
    paintVouchers();
  }
  function paintVouchers() {
    const tbody = document.getElementById("voucherRows");
    document.getElementById("voucherEmpty").style.display = allVouchers.length ? "none" : "block";
    tbody.innerHTML = allVouchers
      .map(
        (v) => `<tr>
        <td>${v.voucherNo}</td><td>${fmtDate(v.date)}</td><td>${v.description}</td>
        <td>${v.chequeNo || "—"}</td><td class="num">${money(v.amount)}</td>
        <td>
          <button class="btn-ghost" data-print="${v.id}" style="padding:4px 10px;">${t("a4Print")}</button>
          <button class="btn-danger" data-del="${v.id}" style="padding:4px 10px;">${t("delete")}</button>
        </td>
      </tr>`
      )
      .join("");
    tbody.querySelectorAll("[data-print]").forEach((btn) => {
      btn.addEventListener("click", () => exportVoucherPDF(allVouchers.find((x) => x.id === btn.dataset.print)));
    });
    tbody.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm(t("confirmDelete"))) return;
        await deleteDoc(doc(db, "vouchers", btn.dataset.del));
        toast(t("deleted"));
        loadVouchers();
      });
    });
  }

  document.getElementById("voucherForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addDoc(collection(db, "vouchers"), {
      voucherNo: fd.get("voucherNo"),
      date: fd.get("date"),
      description: fd.get("description"),
      amount: Number(fd.get("amount")) || 0,
      chequeNo: fd.get("chequeNo") || "",
      remarks: fd.get("remarks") || "",
      enteredBy: identity.uid,
      createdAt: serverTimestamp(),
    });
    toast(t("saved"));
    e.target.reset();
    e.target.date.value = todayISO();
    loadVouchers();
  });

  let allCheques = [];
  async function loadCheques() {
    const snap = await getDocs(query(collection(db, "cheques"), orderBy("date", "desc")));
    allCheques = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    paintCheques();
  }
  function paintCheques() {
    const tbody = document.getElementById("chequeRows");
    document.getElementById("chequeEmpty").style.display = allCheques.length ? "none" : "block";
    tbody.innerHTML = allCheques
      .map(
        (c) => `<tr>
        <td>${c.chequeNo}</td><td>${fmtDate(c.date)}</td><td class="num">${money(c.amount)}</td>
        <td>${c.voucherNo || "—"}</td>
        <td><button class="btn-danger" data-delc="${c.id}" style="padding:4px 10px;">${t("delete")}</button></td>
      </tr>`
      )
      .join("");
    tbody.querySelectorAll("[data-delc]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm(t("confirmDelete"))) return;
        await deleteDoc(doc(db, "cheques", btn.dataset.delc));
        toast(t("deleted"));
        loadCheques();
      });
    });
  }

  document.getElementById("chequeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addDoc(collection(db, "cheques"), {
      chequeNo: fd.get("chequeNo"),
      date: fd.get("date"),
      amount: Number(fd.get("amount")) || 0,
      voucherNo: fd.get("voucherNo") || "",
      enteredBy: identity.uid,
      createdAt: serverTimestamp(),
    });
    toast(t("saved"));
    e.target.reset();
    e.target.date.value = todayISO();
    loadCheques();
  });

  loadVouchers();
  loadCheques();
}
