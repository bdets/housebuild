import {
  db,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "../firebase.js";
import { money, fmtDate, todayISO, toast, fillDatalist } from "../utils.js";
import { printThermalReceipt } from "../print.js";
import { t, getLang } from "../i18n.js";

const PAYMENT_METHODS = ["CASH", "Transfer", "Cheque"];

export async function render(root, identity) {
  const en = getLang() === "en";
  const membersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "member")));
  const members = membersSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.slno || 0) - (b.slno || 0));

  root.innerHTML = `
    <h1>${t("deposits")}</h1>
    <div class="panel">
      <h2>${t("newEntry")}</h2>
      <form id="depositForm" class="form-grid">
        <div><label>${t("member")} *</label><select name="memberId" required>
          <option value="">${t("selectMember")}</option>
          ${members.map((m) => `<option value="${m.id}">${m.slno ?? ""}. ${m.name}</option>`).join("")}
        </select></div>
        <div><label>${t("date")} *</label><input type="date" name="date" value="${todayISO()}" required /></div>
        <div><label>${en ? "Details (e.g. 1st/2nd Installment)" : "বিস্তারিত (যেমন: ১ম/২য় কিস্তি)"}</label>
          <input type="text" name="installmentStep" list="installmentSuggestions" autocomplete="off" placeholder="${en ? "1st Installment" : "1st Installment"}" />
          <datalist id="installmentSuggestions"></datalist>
        </div>
        <div><label>${t("paymentMethod")} *</label><select name="paymentMethod" required>
          ${PAYMENT_METHODS.map((p) => `<option value="${p}">${p}</option>`).join("")}
        </select></div>
        <div><label>${t("amount")} (৳) *</label><input type="number" name="amount" min="0" step="1" required /></div>
        <div><label>${t("fine")} (৳)</label><input type="number" name="fine" min="0" step="1" value="0" /></div>
        <div style="grid-column:1/-1"><label>${t("remarks")}</label>
          <input type="text" name="remarks" list="remarksSuggestions" autocomplete="off" />
          <datalist id="remarksSuggestions"></datalist>
        </div>
        <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="autoReceipt" name="autoReceipt" checked style="width:auto;" />
          <label for="autoReceipt" style="margin:0;">${t("printReceiptAfterSave")}</label>
        </div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("submit")}</button></div>
      </form>
    </div>
    <div class="panel">
      <h2>${t("allEntries")}</h2>
      <div class="form-grid" style="margin-bottom:14px; max-width:320px;">
        <div><label>${t("filterByMember")}</label><select id="filterMember">
          <option value="">${t("everyone")}</option>
          ${members.map((m) => `<option value="${m.id}">${m.name}</option>`).join("")}
        </select></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("date")}</th><th>${t("member")}</th><th>${en ? "Details" : "বিস্তারিত"}</th><th>${t("method")}</th><th class="num">${t("amount")}</th><th class="num">${t("fine")}</th><th>${t("remarks")}</th><th></th></tr></thead>
        <tbody id="depositRows"></tbody>
      </table></div>
      <div id="depositEmpty" class="empty-state" style="display:none;">${t("noEntries")}</div>
    </div>
  `;

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));
  let allDeposits = [];

  async function loadDeposits() {
    const q = query(collection(db, "deposits"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    allDeposits = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    fillDatalist("remarksSuggestions", allDeposits.map((d) => d.remarks));
    fillDatalist("installmentSuggestions", allDeposits.map((d) => d.installmentStep));
    const methodSelect = document.querySelector('#depositForm select[name="paymentMethod"]');
    if (methodSelect && allDeposits[0]?.paymentMethod) methodSelect.value = allDeposits[0].paymentMethod;
    paint();
  }

  function paint() {
    const filterId = document.getElementById("filterMember").value;
    const rows = filterId ? allDeposits.filter((d) => d.memberId === filterId) : allDeposits;
    const tbody = document.getElementById("depositRows");
    document.getElementById("depositEmpty").style.display = rows.length ? "none" : "block";
    tbody.innerHTML = rows
      .map(
        (d) => `<tr>
        <td>${fmtDate(d.date)}</td><td>${memberMap[d.memberId] || "—"}</td>
        <td>${d.installmentStep || "—"}</td>
        <td><span class="pill pill-${(d.paymentMethod || "").toLowerCase()}">${d.paymentMethod || ""}</span></td>
        <td class="num">${money(d.amount)}</td><td class="num">${money(d.fine)}</td>
        <td>${d.remarks || ""}</td>
        <td>
          <button class="btn-ghost" data-receipt="${d.id}" style="padding:4px 10px;">${t("printReceipt")}</button>
          <button class="btn-danger" data-del="${d.id}" style="padding:4px 10px;">${t("delete")}</button>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll("[data-receipt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const d = allDeposits.find((x) => x.id === btn.dataset.receipt);
        printThermalReceipt({ deposit: d, member: { name: memberMap[d.memberId] || "" } });
      });
    });
    tbody.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm(t("confirmDelete"))) return;
        await deleteDoc(doc(db, "deposits", btn.dataset.del));
        toast(t("deleted"));
        loadDeposits();
      });
    });
  }

  document.getElementById("filterMember").addEventListener("change", paint);

  document.getElementById("depositForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      memberId: fd.get("memberId"),
      date: fd.get("date"),
      installmentStep: fd.get("installmentStep") || null,
      paymentMethod: fd.get("paymentMethod"),
      amount: Number(fd.get("amount")) || 0,
      fine: Number(fd.get("fine")) || 0,
      remarks: fd.get("remarks") || "",
      enteredBy: identity.uid,
      createdAt: serverTimestamp(),
    };
    if (!payload.memberId) {
      toast(en ? "Select a member." : "সদস্য নির্বাচন করুন।", true);
      return;
    }
    const ref = await addDoc(collection(db, "deposits"), payload);
    toast(t("saved"));
    if (fd.get("autoReceipt")) {
      printThermalReceipt({ deposit: { ...payload, id: ref.id }, member: { name: memberMap[payload.memberId] || "" } });
    }
    e.target.reset();
    e.target.date.value = todayISO();
    document.getElementById("autoReceipt").checked = true;
    loadDeposits();
  });

  loadDeposits();
}
