import { computeBalanceSummary } from "../reports.js";
import { money } from "../utils.js";
import { exportBalanceReportPDF } from "../print.js";
import { db, doc, setDoc } from "../firebase.js";
import { t, getLang } from "../i18n.js";

export async function render(root) {
  const en = getLang() === "en";
  root.innerHTML = `<h1>${t("dashboard")}</h1><p class="muted">${en ? "Loading all figures..." : "সব হিসাব লোড হচ্ছে..."}</p>`;

  const summary = await computeBalanceSummary();

  try {
    await setDoc(doc(db, "config", "costPerShare"), { value: summary.costPerShare });
  } catch (e) {
    /* non-fatal if offline — will sync once back online */
  }

  root.innerHTML = `
    <h1>${t("dashboard")}</h1>
    <p class="muted">${t("liveCalcNote")}</p>
    <div class="cards">
      <div class="card"><div class="label">${t("totalDeposit")}</div><div class="value">${money(summary.totalDeposit)}</div></div>
      <div class="card"><div class="label">${t("totalFine")}</div><div class="value">${money(summary.totalFine)}</div></div>
      <div class="card"><div class="label">${t("totalCost")}</div><div class="value">${money(summary.totalCost)}</div></div>
      <div class="card"><div class="label">${t("bankBalance")}</div><div class="value ${summary.bankBalance < 0 ? "due" : "ok"}">${money(summary.bankBalance)}</div></div>
      <div class="card"><div class="label">${t("totalShares")}</div><div class="value">${summary.totalShares}</div></div>
      <div class="card"><div class="label">${t("costPerShare")}</div><div class="value">${money(summary.costPerShare)}</div></div>
    </div>
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2>${t("duesByMember")}</h2>
        <button id="exportReportBtn" class="btn-gold">${t("exportReportPdf")}</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${t("member")}</th><th class="num">${t("share")}</th><th class="num">${t("demand")}</th><th class="num">${t("totalDeposit")}</th><th class="num">${t("due")}</th></tr></thead>
          <tbody>
            ${summary.perMember
              .map(
                (m) => `<tr>
                <td>${m.name}</td><td class="num">${m.share ?? ""}</td>
                <td class="num">${money(m.demand)}</td><td class="num">${money(m.deposit)}</td>
                <td class="num" style="${m.due > 0 ? "color:var(--danger);font-weight:600;" : "color:var(--ok);"}">${money(m.due)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("exportReportBtn").addEventListener("click", () => exportBalanceReportPDF(summary));
}
