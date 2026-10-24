import { db, collection, getDocs, query, where } from "../firebase.js";
import { money, fmtDate, todayISO } from "../utils.js";
import {
  computeBalanceSummary,
  computeDepositSummary,
  computeItemWiseSummary,
  getMemberStatementData,
} from "../reports.js";
import {
  exportDepositSummaryPDF,
  exportShareholdersListPDF,
  exportItemWiseSummaryPDF,
  exportMemberStatementPDF,
} from "../print.js";
import { t, getLang } from "../i18n.js";

export async function render(root) {
  const en = getLang() === "en";
  const membersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "member")));
  const members = membersSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.slno || 0) - (b.slno || 0));

  root.innerHTML = `
    <h1>${t("statements")}</h1>

    <div class="panel">
      <h2>${t("depositSummary")}</h2>
      <form id="depositSummaryForm" class="form-grid">
        <div><label>${t("startDate")}</label><input type="date" name="startDate" /></div>
        <div><label>${t("endDate")}</label><input type="date" name="endDate" value="${todayISO()}" /></div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("generate")}</button></div>
      </form>
      <div id="depositSummaryResult"></div>
    </div>

    <div class="panel">
      <h2>${t("individualStatement")}</h2>
      <form id="individualForm" class="form-grid">
        <div style="grid-column:1/-1"><label>${t("member")}</label>
          <select name="memberId" required>
            <option value="">${t("pickMember")}</option>
            ${members.map((m) => `<option value="${m.id}">${m.slno ?? ""}. ${m.name}</option>`).join("")}
          </select>
        </div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("generate")}</button></div>
      </form>
      <div id="individualResult"></div>
    </div>

    <div class="panel">
      <h2>${t("shareholdersList")}</h2>
      <div class="btn-row"><button id="shareholdersBtn" class="btn-gold">${t("generate")}</button></div>
      <div id="shareholdersResult"></div>
    </div>

    <div class="panel">
      <h2>${t("itemWiseSummary")}</h2>
      <form id="itemWiseForm" class="form-grid">
        <div><label>${t("startDate")}</label><input type="date" name="startDate" /></div>
        <div><label>${t("endDate")}</label><input type="date" name="endDate" value="${todayISO()}" /></div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("generate")}</button></div>
      </form>
      <div id="itemWiseResult"></div>
    </div>
  `;

  // ---- 1) Deposit Summary ----
  document.getElementById("depositSummaryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const startDate = fd.get("startDate") || null;
    const endDate = fd.get("endDate") || null;
    const data = await computeDepositSummary(startDate, endDate);
    const box = document.getElementById("depositSummaryResult");
    box.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>ID_no</th><th>${en ? "From Source" : "নাম"}</th><th class="num">${t("amount")}</th><th class="num">${t("fine")}</th><th class="num">${en ? "Total Amount" : "মোট"}</th></tr></thead>
        <tbody>
          ${data.rows.map((r) => `<tr><td>${r.idNo || r.slno || ""}</td><td>${r.name}</td><td class="num">${money(r.amount)}</td><td class="num">${money(r.fine)}</td><td class="num">${money(r.total)}</td></tr>`).join("")}
        </tbody>
        <tfoot><tr style="font-weight:700;"><td></td><td>${t("grandTotal")}</td><td class="num">${money(data.grand.amount)}</td><td class="num">${money(data.grand.fine)}</td><td class="num">${money(data.grand.total)}</td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="depositSummaryPdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("depositSummaryPdfBtn").addEventListener("click", () => exportDepositSummaryPDF(data));
  });

  // ---- 2) Individual Deposit Statement ----
  document.getElementById("individualForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const memberId = new FormData(e.target).get("memberId");
    if (!memberId) return;
    const { profile, deposits } = await getMemberStatementData(memberId);
    const totalAmount = deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const totalFine = deposits.reduce((s, d) => s + (Number(d.fine) || 0), 0);
    const summary = { deposit: totalAmount, due: null }; // due needs cost-per-share; PDF shows "—" if null
    const box = document.getElementById("individualResult");
    box.innerHTML = `
      <p class="muted">${t("mobile") || "Mobile"}: ${profile?.mobile || "—"} · ID: ${profile?.idNo || profile?.slno || "—"}</p>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("date")}</th><th>Slno</th><th>${en ? "Details" : "বিস্তারিত"}</th><th class="num">${t("amount")}</th><th class="num">${t("fine")}</th><th class="num">${en ? "Total" : "মোট"}</th><th>${t("remarks")}</th></tr></thead>
        <tbody>
          ${deposits
            .map(
              (d, i) => `<tr><td>${fmtDate(d.date)}</td><td>${i + 1}</td><td>${d.installmentStep || "—"}</td>
              <td class="num">${money(d.amount)}</td><td class="num">${money(d.fine)}</td>
              <td class="num">${money((Number(d.amount) || 0) + (Number(d.fine) || 0))}</td><td>${d.remarks || ""}</td></tr>`
            )
            .join("")}
        </tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="3">${t("grandTotal")}</td><td class="num">${money(totalAmount)}</td><td class="num">${money(totalFine)}</td><td class="num">${money(totalAmount + totalFine)}</td><td></td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="individualPdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("individualPdfBtn").addEventListener("click", () =>
      exportMemberStatementPDF({ member: profile || {}, deposits, summary })
    );
  });

  // ---- 3) Shareholders List ----
  document.getElementById("shareholdersBtn").addEventListener("click", async () => {
    const summary = await computeBalanceSummary();
    const totalShare = summary.perMember.reduce((s, m) => s + (Number(m.share) || 0), 0);
    const totalDeposit = summary.perMember.reduce((s, m) => s + (Number(m.deposit) || 0), 0);
    const totalDue = summary.perMember.reduce((s, m) => s + (Number(m.due) || 0), 0);
    const box = document.getElementById("shareholdersResult");
    box.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Slno</th><th>${t("name")}</th><th>ID</th><th>${t("mobile")}</th><th class="num">${t("totalShare")}</th><th class="num">${en ? "Total Deposit" : "মোট জমা"}</th><th class="num">${en ? "Total Due" : "মোট বকেয়া"}</th></tr></thead>
        <tbody>
          ${summary.perMember
            .map(
              (m, i) => `<tr><td>${m.slno ?? i + 1}</td><td>${m.name}</td><td>${m.idNo || ""}</td><td>${m.mobile || ""}</td>
              <td class="num">${m.share ?? ""}</td><td class="num">${money(m.deposit)}</td>
              <td class="num" style="${m.due > 0 ? "color:var(--danger);font-weight:600;" : "color:var(--ok);"}">${money(m.due)}</td></tr>`
            )
            .join("")}
        </tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="4">${en ? "Total" : "মোট"}:</td><td class="num">${totalShare}</td><td class="num">${money(totalDeposit)}</td><td class="num">${money(totalDue)}</td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="shareholdersPdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("shareholdersPdfBtn").addEventListener("click", () => exportShareholdersListPDF(summary));
  });

  // ---- 4) Item-wise Summary ----
  document.getElementById("itemWiseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const startDate = fd.get("startDate") || null;
    const endDate = fd.get("endDate") || null;
    const data = await computeItemWiseSummary(startDate, endDate);
    const box = document.getElementById("itemWiseResult");
    box.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Serial No</th><th>${t("item")}</th><th class="num">${t("amount")}</th></tr></thead>
        <tbody>
          ${data.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.item}</td><td class="num">${money(r.amount)}</td></tr>`).join("")}
        </tbody>
        <tfoot><tr style="font-weight:700;"><td colspan="2">${t("grandTotal")}</td><td class="num">${money(data.grandTotal)}</td></tr></tfoot>
      </table></div>
      <div class="btn-row"><button id="itemWisePdfBtn" class="btn-gold">${t("downloadPdf")}</button></div>
    `;
    document.getElementById("itemWisePdfBtn").addEventListener("click", () => exportItemWiseSummaryPDF(data));
  });
}
