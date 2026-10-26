import { db, collection, getDocs, query, where } from "../firebase.js";
import { money, fmtDate, todayISO } from "../utils.js";
import { getCostItems } from "../config-lists.js";
import {
  computeBalanceSummary,
  computeDepositSummary,
  computeItemWiseSummary,
  getMemberStatementData,
  getTotalCostStatement,
  getItemWiseIndividual,
  getAllBeneficiaryPayments,
  getBeneficiaryStatement,
  getKnownBeneficiaries,
  computeAssetsLiabilities,
  computeDepositsAndDues,
  getCashVoucherReport,
} from "../reports.js";
import {
  exportDepositSummaryPDF,
  exportShareholdersListPDF,
  exportItemWiseSummaryPDF,
  exportMemberStatementPDF,
  exportTotalCostStatementPDF,
  exportItemWiseIndividualPDF,
  exportAllBeneficiaryPaymentsPDF,
  exportBeneficiaryStatementPDF,
  exportAssetsLiabilitiesPDF,
  exportDepositsAndDuesPDF,
  exportCashVoucherReportPDF,
} from "../print.js";
import { t, getLang } from "../i18n.js";

export async function render(root, identity, reportKey) {
  const RENDERERS = {
    "rpt-deposit-summary": renderDepositSummary,
    "rpt-individual-statement": renderIndividualStatement,
    "rpt-shareholders-list": renderShareholdersList,
    "rpt-item-wise-summary": renderItemWiseSummary,
    "rpt-item-wise-indv": renderItemWiseIndv,
    "rpt-total-cost": renderTotalCost,
    "rpt-all-benefi": renderAllBenefi,
    "rpt-indv-benefi": renderIndvBenefi,
    "rpt-assets-liabilities": renderAssetsLiabilities,
    "rpt-deposits-dues": renderDepositsDues,
    "rpt-cash-voucher": renderCashVoucher,
  };
  const fn = RENDERERS[reportKey];
  if (!fn) {
    root.innerHTML = `<div class="empty-state">Unknown report.</div>`;
    return;
  }
  await fn(root);
}

function dateRangeForm(en) {
  return `
    <form id="rangeForm" class="form-grid">
      <div><label>${t("startDate")}</label><input type="date" name="startDate" /></div>
      <div><label>${t("endDate")}</label><input type="date" name="endDate" value="${todayISO()}" /></div>
      <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("generate")}</button></div>
    </form>
    <div id="result"></div>
  `;
}

// ---- 1) Deposit Summary ----
async function renderDepositSummary(root) {
  const en = getLang() === "en";
  root.innerHTML = `<h1>${t("depositSummary")}</h1><div class="panel">${dateRangeForm(en)}</div>`;
  document.getElementById("rangeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await computeDepositSummary(fd.get("startDate") || null, fd.get("endDate") || null);
    document.getElementById("result").innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>ID_no</th><th>${en ? "From Source" : "নাম"}</th><th class="num">${t("amount")}</th><th class="num">${t("fine")}</th><th class="num">${en ? "Total Amount" : "মোট"}</th></tr></thead>
        <tbody>${data.rows.map((r) => `<tr><td>${r.idNo || r.slno || ""}</td><td>${r.name}</td><td class="num">${money(r.amount)}</td><td class="num">${money(r.fine)}</td><td class="num">${money(r.total)}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td></td><td>${t("grandTotal")}</td><td class="num">${money(data.grand.amount)}</td><td class="num">${money(data.grand.fine)}</td><td class="num">${money(data.grand.total)}</td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportDepositSummaryPDF(data));
  });
}

// ---- 2) Individual Deposit Statement ----
async function renderIndividualStatement(root) {
  const en = getLang() === "en";
  const membersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "member")));
  const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.slno || 0) - (b.slno || 0));

  root.innerHTML = `
    <h1>${t("individualStatement")}</h1>
    <div class="panel">
      <form id="pickForm" class="form-grid">
        <div style="grid-column:1/-1"><label>${t("member")}</label>
          <select name="memberId" required>
            <option value="">${t("pickMember")}</option>
            ${members.map((m) => `<option value="${m.id}">${m.slno ?? ""}. ${m.name}</option>`).join("")}
          </select>
        </div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("generate")}</button></div>
      </form>
      <div id="result"></div>
    </div>
  `;

  document.getElementById("pickForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const memberId = new FormData(e.target).get("memberId");
    if (!memberId) return;
    const { profile, deposits } = await getMemberStatementData(memberId);
    const totalAmount = deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const totalFine = deposits.reduce((s, d) => s + (Number(d.fine) || 0), 0);
    const summary = { deposit: totalAmount, due: null };
    document.getElementById("result").innerHTML = `
      <p class="muted">${en ? "Mobile" : "মোবাইল"}: ${profile?.mobile || "—"} · ID: ${profile?.idNo || profile?.slno || "—"}</p>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("date")}</th><th>Slno</th><th>${en ? "Details" : "বিস্তারিত"}</th><th class="num">${t("amount")}</th><th class="num">${t("fine")}</th><th class="num">${en ? "Total" : "মোট"}</th><th>${t("remarks")}</th></tr></thead>
        <tbody>${deposits.map((d, i) => `<tr><td>${fmtDate(d.date)}</td><td>${i + 1}</td><td>${d.installmentStep || "—"}</td><td class="num">${money(d.amount)}</td><td class="num">${money(d.fine)}</td><td class="num">${money((Number(d.amount) || 0) + (Number(d.fine) || 0))}</td><td>${d.remarks || ""}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="3">${t("grandTotal")}</td><td class="num">${money(totalAmount)}</td><td class="num">${money(totalFine)}</td><td class="num">${money(totalAmount + totalFine)}</td><td></td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportMemberStatementPDF({ member: profile || {}, deposits, summary }));
  });
}

// ---- 3) Shareholders List ----
async function renderShareholdersList(root) {
  const en = getLang() === "en";
  root.innerHTML = `<h1>${t("shareholdersList")}</h1><div class="panel"><div class="btn-row"><button id="genBtn" class="btn-primary">${t("generate")}</button></div><div id="result"></div></div>`;
  document.getElementById("genBtn").addEventListener("click", async () => {
    const summary = await computeBalanceSummary();
    const totalShare = summary.perMember.reduce((s, m) => s + (Number(m.share) || 0), 0);
    const totalDeposit = summary.perMember.reduce((s, m) => s + (Number(m.deposit) || 0), 0);
    const totalDue = summary.perMember.reduce((s, m) => s + (Number(m.due) || 0), 0);
    document.getElementById("result").innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Slno</th><th>${t("name")}</th><th>ID</th><th>${t("mobile")}</th><th class="num">${t("totalShare")}</th><th class="num">${en ? "Total Deposit" : "মোট জমা"}</th><th class="num">${en ? "Total Due" : "মোট বকেয়া"}</th></tr></thead>
        <tbody>${summary.perMember.map((m, i) => `<tr><td>${m.slno ?? i + 1}</td><td>${m.name}</td><td>${m.idNo || ""}</td><td>${m.mobile || ""}</td><td class="num">${m.share ?? ""}</td><td class="num">${money(m.deposit)}</td><td class="num" style="${m.due > 0 ? "color:var(--danger);font-weight:600;" : "color:var(--ok);"}">${money(m.due)}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="4">${en ? "Total" : "মোট"}:</td><td class="num">${totalShare}</td><td class="num">${money(totalDeposit)}</td><td class="num">${money(totalDue)}</td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportShareholdersListPDF(summary));
  });
}

// ---- 4) Item Wise Summary ----
async function renderItemWiseSummary(root) {
  const en = getLang() === "en";
  root.innerHTML = `<h1>${t("itemWiseSummary")}</h1><div class="panel">${dateRangeForm(en)}</div>`;
  document.getElementById("rangeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await computeItemWiseSummary(fd.get("startDate") || null, fd.get("endDate") || null);
    document.getElementById("result").innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Serial No</th><th>${t("item")}</th><th class="num">${t("amount")}</th></tr></thead>
        <tbody>${data.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.item}</td><td class="num">${money(r.amount)}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="2">${t("grandTotal")}</td><td class="num">${money(data.grandTotal)}</td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportItemWiseSummaryPDF(data));
  });
}

// ---- 5) Item Wise Cost Indv. ----
async function renderItemWiseIndv(root) {
  const en = getLang() === "en";
  const items = await getCostItems();
  root.innerHTML = `
    <h1>${t("itemWiseCostIndv")}</h1>
    <div class="panel">
      <form id="pickForm" class="form-grid">
        <div><label>${t("item")}</label><select name="item" required>
          <option value="">${t("pickItem")}</option>
          ${items.map((i) => `<option value="${i}">${i}</option>`).join("")}
        </select></div>
        <div><label>${t("startDate")}</label><input type="date" name="startDate" /></div>
        <div><label>${t("endDate")}</label><input type="date" name="endDate" value="${todayISO()}" /></div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("generate")}</button></div>
      </form>
      <div id="result"></div>
    </div>
  `;
  document.getElementById("pickForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = fd.get("item");
    if (!item) return;
    const data = await getItemWiseIndividual(item, fd.get("startDate") || null, fd.get("endDate") || null);
    document.getElementById("result").innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>${t("date")}</th><th>${t("beneficiary")}</th><th>${t("method")}</th><th class="num">${t("amount")}</th><th>${t("remarks")}</th></tr></thead>
        <tbody>${data.rows.map((c) => `<tr><td>${fmtDate(c.date)}</td><td>${c.beneficiary || ""}</td><td>${c.paymentMethod || ""}</td><td class="num">${money(c.amount)}</td><td>${c.remarks || ""}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="3">${t("grandTotal")}</td><td class="num">${money(data.grandTotal)}</td><td></td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportItemWiseIndividualPDF(data));
  });
}

// ---- 6) Total Cost Statement ----
async function renderTotalCost(root) {
  const en = getLang() === "en";
  root.innerHTML = `<h1>${t("totalCostStatement")}</h1><div class="panel">${dateRangeForm(en)}</div>`;
  document.getElementById("rangeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await getTotalCostStatement(fd.get("startDate") || null, fd.get("endDate") || null);
    document.getElementById("result").innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>${t("date")}</th><th>${t("item")}</th><th>${t("beneficiary")}</th><th>${t("method")}</th><th>${en ? "Cheque/Chalan" : "চেক/চালান"}</th><th class="num">${t("amount")}</th><th>${t("remarks")}</th></tr></thead>
        <tbody>${data.rows.map((c) => `<tr><td>${fmtDate(c.date)}</td><td>${c.item || ""}</td><td>${c.beneficiary || ""}</td><td>${c.paymentMethod || ""}</td><td>${c.chequeNo || c.chalanNo || "—"}</td><td class="num">${money(c.amount)}</td><td>${c.remarks || ""}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="5">${t("grandTotal")}</td><td class="num">${money(data.grandTotal)}</td><td></td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportTotalCostStatementPDF(data));
  });
}

// ---- 7) All Benefi. Pays ----
async function renderAllBenefi(root) {
  const en = getLang() === "en";
  root.innerHTML = `<h1>${t("allBenefiPays")}</h1><div class="panel">${dateRangeForm(en)}</div>`;
  document.getElementById("rangeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await getAllBeneficiaryPayments(fd.get("startDate") || null, fd.get("endDate") || null);
    document.getElementById("result").innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>${t("beneficiary")}</th><th class="num">${en ? "Total Paid" : "মোট পরিশোধ"}</th></tr></thead>
        <tbody>${data.rows.map((r) => `<tr><td>${r.beneficiary}</td><td class="num">${money(r.amount)}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td>${t("grandTotal")}</td><td class="num">${money(data.grandTotal)}</td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportAllBeneficiaryPaymentsPDF(data));
  });
}

// ---- 8) Indv. Benefi. Pay ----
async function renderIndvBenefi(root) {
  const en = getLang() === "en";
  const names = await getKnownBeneficiaries();
  root.innerHTML = `
    <h1>${t("indvBenefiPay")}</h1>
    <div class="panel">
      <form id="pickForm" class="form-grid">
        <div><label>${t("beneficiary")}</label><select name="beneficiary" required>
          <option value="">${t("pickBeneficiary")}</option>
          ${names.map((n) => `<option value="${n}">${n}</option>`).join("")}
        </select></div>
        <div><label>${t("startDate")}</label><input type="date" name="startDate" /></div>
        <div><label>${t("endDate")}</label><input type="date" name="endDate" value="${todayISO()}" /></div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("generate")}</button></div>
      </form>
      <div id="result"></div>
    </div>
  `;
  document.getElementById("pickForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const beneficiary = fd.get("beneficiary");
    if (!beneficiary) return;
    const data = await getBeneficiaryStatement(beneficiary, fd.get("startDate") || null, fd.get("endDate") || null);
    document.getElementById("result").innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>${t("date")}</th><th>${t("item")}</th><th>${t("method")}</th><th class="num">${t("amount")}</th><th>${t("remarks")}</th></tr></thead>
        <tbody>${data.rows.map((c) => `<tr><td>${fmtDate(c.date)}</td><td>${c.item || ""}</td><td>${c.paymentMethod || ""}</td><td class="num">${money(c.amount)}</td><td>${c.remarks || ""}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="3">${t("grandTotal")}</td><td class="num">${money(data.grandTotal)}</td><td></td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportBeneficiaryStatementPDF(data));
  });
}

// ---- 9) Assets & Liabilities ----
async function renderAssetsLiabilities(root) {
  const en = getLang() === "en";
  root.innerHTML = `<h1>${t("assetsLiabilities")}</h1><div class="panel"><div class="btn-row"><button id="genBtn" class="btn-primary">${t("generate")}</button></div><div id="result"></div></div>`;
  document.getElementById("genBtn").addEventListener("click", async () => {
    const data = await computeAssetsLiabilities();
    document.getElementById("result").innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px;">
        <div><h3>${en ? "Liabilities" : "দায়"}</h3>
          <div class="table-wrap"><table>
            <tbody>${data.liabilities.map((l) => `<tr><td>${l.label}</td><td class="num">${money(l.amount)}</td></tr>`).join("")}</tbody>
            <tfoot><tr style="font-weight:700;"><td>${en ? "Total" : "মোট"}</td><td class="num">${money(data.totalLiabilities)}</td></tr></tfoot>
          </table></div>
        </div>
        <div><h3>${en ? "Assets" : "সম্পদ"}</h3>
          <div class="table-wrap"><table>
            <tbody>${data.assets.map((a) => `<tr><td>${a.label}</td><td class="num">${money(a.amount)}</td></tr>`).join("")}</tbody>
            <tfoot><tr style="font-weight:700;"><td>${en ? "Total" : "মোট"}</td><td class="num">${money(data.totalAssets)}</td></tr></tfoot>
          </table></div>
        </div>
      </div>
      <p style="margin-top:12px;font-weight:600;">${t("bankBalance")}: ${money(data.bankBalance)} · ${t("costPerShare")}: ${money(data.costPerShare)}</p>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportAssetsLiabilitiesPDF(data));
  });
}

// ---- 10) Deposits & Dues ----
async function renderDepositsDues(root) {
  const en = getLang() === "en";
  root.innerHTML = `<h1>${t("depositsDues")}</h1><div class="panel"><div class="btn-row"><button id="genBtn" class="btn-primary">${t("generate")}</button></div><div id="result"></div></div>`;
  document.getElementById("genBtn").addEventListener("click", async () => {
    const data = await computeDepositsAndDues();
    document.getElementById("result").innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>${t("name")}</th><th class="num">${en ? "Deposit" : "জমা"}</th><th class="num">${t("due")}</th></tr></thead>
        <tbody>${data.rows.map((r) => `<tr><td>${r.name}</td><td class="num">${money(r.deposit)}</td><td class="num" style="${r.due > 0 ? "color:var(--danger);font-weight:600;" : "color:var(--ok);"}">${money(r.due)}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td>${en ? "Total" : "মোট"}</td><td class="num">${money(data.totalDeposit)}</td><td class="num">${money(data.totalDue)}</td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportDepositsAndDuesPDF(data));
  });
}

// ---- 11) Cash Voucher (report view) ----
async function renderCashVoucher(root) {
  const en = getLang() === "en";
  root.innerHTML = `<h1>${t("cashVoucherReport")}</h1><div class="panel"><div class="btn-row"><button id="genBtn" class="btn-primary">${t("generate")}</button></div><div id="result"></div></div>`;
  document.getElementById("genBtn").addEventListener("click", async () => {
    const data = await getCashVoucherReport();
    document.getElementById("result").innerHTML = `
      <h3>${t("vouchers") || "Vouchers"}</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("voucherNo")}</th><th>${t("date")}</th><th>${t("description")}</th><th>${t("chequeNo")}</th><th class="num">${t("amount")}</th></tr></thead>
        <tbody>${data.vouchers.map((v) => `<tr><td>${v.voucherNo}</td><td>${fmtDate(v.date)}</td><td>${v.description}</td><td>${v.chequeNo || "—"}</td><td class="num">${money(v.amount)}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="4">${en ? "Total" : "মোট"}</td><td class="num">${money(data.totalVouchers)}</td></tr></tfoot>
      </table></div>
      <h3 style="margin-top:16px;">${t("chequeRegister")}</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("chequeNo")}</th><th>${t("date")}</th><th class="num">${t("amount")}</th><th>${t("voucherNo")}</th></tr></thead>
        <tbody>${data.cheques.map((c) => `<tr><td>${c.chequeNo}</td><td>${fmtDate(c.date)}</td><td class="num">${money(c.amount)}</td><td>${c.voucherNo || "—"}</td></tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="2">${en ? "Total" : "মোট"}</td><td class="num">${money(data.totalCheques)}</td><td></td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="pdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("pdfBtn").addEventListener("click", () => exportCashVoucherReportPDF(data));
  });
}
