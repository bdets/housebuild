import { db, collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "../firebase.js";
import { money, fmtDate, todayISO, toast, fillDatalist } from "../utils.js";
import { getCostItems } from "../config-lists.js";
import { t, getLang } from "../i18n.js";

const PAYMENT_METHODS = ["CASH", "Transfer", "Cheque"];

async function loadAllCosts() {
  const snap = await getDocs(query(collection(db, "costs"), orderBy("date", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function costRowHtml(c) {
  return `<tr>
    <td>${fmtDate(c.date)}</td><td>${c.item || ""}</td><td>${c.beneficiary || ""}</td>
    <td><span class="pill pill-${(c.paymentMethod || "").toLowerCase()}">${c.paymentMethod || ""}</span></td>
    <td>${c.chequeNo || c.chalanNo || "—"}</td><td class="num">${money(c.amount)}</td>
    <td>${c.remarks || ""}</td>
    <td><button class="btn-danger" data-del="${c.id}" style="padding:4px 10px;">${t("delete")}</button></td>
  </tr>`;
}

function wireRowButtons(tbody, onChange) {
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm(t("confirmDelete"))) return;
      await deleteDoc(doc(db, "costs", btn.dataset.del));
      toast(t("deleted"));
      onChange();
    });
  });
}

// ---- Cost Entry (form + recent entries) ----
export async function renderEntry(root, identity) {
  const en = getLang() === "en";
  const items = await getCostItems();

  root.innerHTML = `
    <h1>${t("costEntry")}</h1>
    <div class="panel">
      <form id="costForm" class="form-grid">
        <div><label>${t("date")} *</label><input type="date" name="date" value="${todayISO()}" required /></div>
        <div><label>${t("item")} *</label><select name="item" required>${items.map((i) => `<option value="${i}">${i}</option>`).join("")}</select></div>
        <div><label>${t("beneficiary")} *</label>
          <input type="text" name="beneficiary" list="beneficiarySuggestions" autocomplete="off" required />
          <datalist id="beneficiarySuggestions"></datalist>
        </div>
        <div><label>${t("paymentMethod")} *</label><select name="paymentMethod" required>${PAYMENT_METHODS.map((p) => `<option value="${p}">${p}</option>`).join("")}</select></div>
        <div><label>${t("chequeNo")}</label><input type="text" name="chequeNo" /></div>
        <div><label>${t("chalanNo")}</label><input type="text" name="chalanNo" /></div>
        <div><label>${t("amount")} (৳) *</label><input type="number" name="amount" min="0" step="1" required /></div>
        <div style="grid-column:1/-1"><label>${t("remarks")}</label>
          <input type="text" name="remarks" list="costRemarksSuggestions" autocomplete="off" />
          <datalist id="costRemarksSuggestions"></datalist>
        </div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("submit")}</button></div>
      </form>
    </div>
    <div class="panel">
      <h2>${en ? "Recent entries" : "সাম্প্রতিক এন্ট্রি"}</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("date")}</th><th>${t("item")}</th><th>${t("beneficiary")}</th><th>${t("method")}</th><th>${en ? "Cheque/Chalan" : "চেক/চালান"}</th><th class="num">${t("amount")}</th><th>${t("remarks")}</th><th></th></tr></thead>
        <tbody id="recentRows"></tbody>
      </table></div>
    </div>
  `;

  async function refreshRecent() {
    const all = await loadAllCosts();
    fillDatalist("beneficiarySuggestions", all.map((c) => c.beneficiary));
    fillDatalist("costRemarksSuggestions", all.map((c) => c.remarks));
    const methodSelect = document.querySelector('#costForm select[name="paymentMethod"]');
    if (methodSelect && all[0]?.paymentMethod) methodSelect.value = all[0].paymentMethod;
    const tbody = document.getElementById("recentRows");
    tbody.innerHTML = all.slice(0, 10).map(costRowHtml).join("");
    wireRowButtons(tbody, refreshRecent);
  }

  document.getElementById("costForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addDoc(collection(db, "costs"), {
      date: fd.get("date"),
      item: fd.get("item"),
      beneficiary: fd.get("beneficiary"),
      paymentMethod: fd.get("paymentMethod"),
      chequeNo: fd.get("chequeNo") || "",
      chalanNo: fd.get("chalanNo") || "",
      amount: Number(fd.get("amount")) || 0,
      remarks: fd.get("remarks") || "",
      enteredBy: identity.uid,
      createdAt: serverTimestamp(),
    });
    toast(t("saved"));
    e.target.reset();
    e.target.date.value = todayISO();
    refreshRecent();
  });

  refreshRecent();
}

// ---- Cost Entry List (full filterable table) ----
export async function renderList(root) {
  const en = getLang() === "en";
  const items = await getCostItems();

  root.innerHTML = `
    <h1>${t("costEntryList")}</h1>
    <div class="panel">
      <div class="form-grid" style="margin-bottom:14px; max-width:320px;">
        <div><label>${t("filterByItem")}</label><select id="filterItem">
          <option value="">${t("allItems")}</option>${items.map((i) => `<option value="${i}">${i}</option>`).join("")}
        </select></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("date")}</th><th>${t("item")}</th><th>${t("beneficiary")}</th><th>${t("method")}</th><th>${en ? "Cheque/Chalan" : "চেক/চালান"}</th><th class="num">${t("amount")}</th><th>${t("remarks")}</th><th></th></tr></thead>
        <tbody id="costRows"></tbody>
      </table></div>
      <div id="costEmpty" class="empty-state" style="display:none;">${t("noEntries")}</div>
    </div>
  `;

  let allCosts = [];
  async function load() {
    allCosts = await loadAllCosts();
    paint();
  }
  function paint() {
    const filterItem = document.getElementById("filterItem").value;
    const rows = filterItem ? allCosts.filter((c) => c.item === filterItem) : allCosts;
    const tbody = document.getElementById("costRows");
    document.getElementById("costEmpty").style.display = rows.length ? "none" : "block";
    tbody.innerHTML = rows.map(costRowHtml).join("");
    wireRowButtons(tbody, load);
  }

  document.getElementById("filterItem").addEventListener("change", paint);
  load();
}

export const render = renderList;
