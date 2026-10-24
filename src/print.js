import { getCachedOrg } from "./org-store.js";
import { money, fmtDate } from "./utils.js";

// jsPDF + autotable are loaded as classic <script> tags in admin.html /
// member.html and attach themselves to window.jspdf.
function getJsPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error("PDF লাইব্রেরি লোড হয়নি — ইন্টারনেট সংযোগ পরীক্ষা করুন।");
  }
  return window.jspdf.jsPDF;
}

function addLetterhead(doc, pageWidth) {
  const org = getCachedOrg();
  if (org.logoDataUrl) {
    try {
      doc.addImage(org.logoDataUrl, "JPEG", 15, 8, 16, 16);
    } catch (e) {
      /* non-fatal — a corrupt/unsupported logo just gets skipped */
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(org.name, pageWidth / 2, 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(org.tagline || "", pageWidth / 2, 21, { align: "center" });
  const addrLines = doc.splitTextToSize(org.address || "", pageWidth - 30);
  doc.text(addrLines, pageWidth / 2, 26, { align: "center" });
  const y = 26 + addrLines.length * 4 + 3;
  doc.setLineWidth(0.3);
  doc.line(15, y, pageWidth - 15, y);
  return y + 6;
}

/**
 * Individual Deposit Statement — mirrors the society's original pivot-table
 * layout: Date / Slno / Details / Amount / Fine / Total Amount / Remarks,
 * with Mobile + ID shown at the top instead of just Share.
 */
export function exportMemberStatementPDF({ member, deposits, summary }) {
  const JsPDF = getJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addLetterhead(doc, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Individual Deposit Statement", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${member.name || ""}`, 15, y);
  doc.text(`ID no: ${member.idNo || member.slno || ""}`, pageWidth - 15, y, { align: "right" });
  y += 6;
  doc.text(`Mobile: ${member.mobile || "—"}`, 15, y);
  doc.text(`Share: ${member.totalShare ?? member.share ?? ""}`, pageWidth - 15, y, { align: "right" });
  y += 8;

  doc.autoTable({
    startY: y,
    head: [["Date", "Slno", "Details", "Amount", "Fine", "Total Amount", "Remarks"]],
    body: deposits.map((d, i) => [
      fmtDate(d.date),
      i + 1,
      d.installmentStep || "—",
      money(d.amount),
      money(d.fine),
      money((Number(d.amount) || 0) + (Number(d.fine) || 0)),
      d.remarks || "",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 52, 46] },
    margin: { left: 15, right: 15 },
  });

  let finalY = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.text(`Total Deposit: ${money(summary?.deposit)}`, 15, finalY);
  doc.text(`Due: ${money(summary?.due)}`, pageWidth - 15, finalY, { align: "right" });

  doc.save(`statement-${(member.name || "member").replace(/\s+/g, "_")}.pdf`);
}

/**
 * Deposit Summary — one row per shareholder, totals within a date range.
 * Matches the society's original "Deposit Summary" sheet.
 */
export function exportDepositSummaryPDF({ rows, grand, startDate, endDate }) {
  const JsPDF = getJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addLetterhead(doc, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Deposit Summary", pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${startDate ? fmtDate(startDate) : "…"}  to  ${endDate ? fmtDate(endDate) : "…"}`, pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.autoTable({
    startY: y,
    head: [["ID_no", "From Source", "Amount", "Fine", "Total Amount"]],
    body: rows.map((r) => [r.idNo || r.slno || "", r.name, money(r.amount), money(r.fine), money(r.total)]),
    foot: [["", "Grand Total", money(grand.amount), money(grand.fine), money(grand.total)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 52, 46] },
    footStyles: { fillColor: [241, 230, 204], textColor: [21, 52, 46], fontStyle: "bold" },
    margin: { left: 15, right: 15 },
  });

  doc.save(`deposit-summary-${startDate || "all"}-to-${endDate || "all"}.pdf`);
}

/**
 * Shareholders List — matches the society's original "Shareholders list"
 * sheet (slno, Name, ID, Mobile, Total Share, Total Deposit, Total Due).
 */
export function exportShareholdersListPDF(summary) {
  const JsPDF = getJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addLetterhead(doc, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Shareholders List", pageWidth / 2, y, { align: "center" });
  y += 8;

  const totalShare = summary.perMember.reduce((s, m) => s + (Number(m.share) || 0), 0);
  const totalDeposit = summary.perMember.reduce((s, m) => s + (Number(m.deposit) || 0), 0);
  const totalDue = summary.perMember.reduce((s, m) => s + (Number(m.due) || 0), 0);

  doc.autoTable({
    startY: y,
    head: [["Slno", "Name", "ID", "Mobile", "Total Share", "Total Deposit", "Total Due"]],
    body: summary.perMember.map((m, i) => [
      m.slno ?? i + 1,
      m.name,
      m.idNo || "",
      m.mobile || "",
      m.share ?? "",
      money(m.deposit),
      money(m.due),
    ]),
    foot: [["", "Total:", "", "", String(totalShare), money(totalDeposit), money(totalDue)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 52, 46] },
    footStyles: { fillColor: [241, 230, 204], textColor: [21, 52, 46], fontStyle: "bold" },
    margin: { left: 15, right: 15 },
  });

  doc.save("shareholders-list.pdf");
}

/**
 * Item-wise Summary — costs grouped by item within a date range. Matches
 * the society's original "Item wise summary" sheet.
 */
export function exportItemWiseSummaryPDF({ rows, grandTotal, startDate, endDate }) {
  const JsPDF = getJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addLetterhead(doc, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Item wise Summary", pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${startDate ? fmtDate(startDate) : "…"}  to  ${endDate ? fmtDate(endDate) : "…"}`, pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.autoTable({
    startY: y,
    head: [["Serial No", "Item", "Amount"]],
    body: rows.map((r, i) => [i + 1, r.item, money(r.amount)]),
    foot: [["", "Grand Total", money(grandTotal)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 52, 46] },
    footStyles: { fillColor: [241, 230, 204], textColor: [21, 52, 46], fontStyle: "bold" },
    margin: { left: 15, right: 15 },
  });

  doc.save(`item-wise-summary-${startDate || "all"}-to-${endDate || "all"}.pdf`);
}

export function exportBalanceReportPDF(summary) {
  const JsPDF = getJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addLetterhead(doc, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Balance & Dues Report", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Total Deposit: ${money(summary.totalDeposit)}    Total Cost: ${money(summary.totalCost)}    ` +
      `Bank Balance: ${money(summary.bankBalance)}    Cost/Share: ${money(summary.costPerShare)}`,
    15,
    y
  );
  y += 6;

  doc.autoTable({
    startY: y,
    head: [["Name", "Share", "Demand", "Deposit", "Due"]],
    body: summary.perMember.map((m) => [m.name, m.share ?? "", money(m.demand), money(m.deposit), money(m.due)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 52, 46] },
    margin: { left: 15, right: 15 },
  });

  doc.save("balance-report.pdf");
}

export function exportVoucherPDF(voucher) {
  const JsPDF = getJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addLetterhead(doc, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Voucher No: ${voucher.voucherNo}`, 15, y);
  doc.text(fmtDate(voucher.date), pageWidth - 15, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Cheque No: ${voucher.chequeNo || "—"}`, 15, y);
  doc.text(`Amount: ${money(voucher.amount)}`, pageWidth - 15, y, { align: "right" });
  y += 10;

  doc.autoTable({
    startY: y,
    head: [["Description", "Remarks"]],
    body: [[voucher.description || "", voucher.remarks || ""]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 52, 46] },
    margin: { left: 15, right: 15 },
  });

  const finalY = doc.lastAutoTable.finalY + 30;
  doc.setFontSize(9);
  doc.text("Prepared by: ______________", 15, finalY);
  doc.text("Approved by: ______________", pageWidth - 15, finalY, { align: "right" });

  doc.save(`voucher-${voucher.voucherNo}.pdf`);
}

export function printThermalReceipt({ deposit, member, voucherNo }) {
  const win = window.open("", "_blank", "width=340,height=600");
  if (!win) {
    alert("পপ-আপ ব্লক করা আছে — এই সাইটের জন্য পপ-আপ অনুমতি দিন।");
    return;
  }
  const org = getCachedOrg();
  win.document.write(`
    <html><head><meta charset="UTF-8" /><title>Receipt</title>
    <style>
      @page { size: 80mm auto; margin: 2mm; }
      body { font-family: 'Noto Sans Bengali', Arial, sans-serif; font-size: 12px; width: 76mm; margin:0; }
      h2 { font-size: 13px; text-align:center; margin: 2px 0; }
      .addr { font-size: 10px; text-align:center; margin-bottom:6px; }
      .line { border-top: 1px dashed #000; margin: 6px 0; }
      table { width:100%; font-size: 11px; border-collapse: collapse; }
      td { padding: 2px 0; } .right { text-align:right; } .center { text-align:center; }
      .big { font-size: 13px; font-weight:bold; }
    </style></head>
    <body>
      ${org.logoDataUrl ? `<div class="center"><img src="${org.logoDataUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" /></div>` : ""}
      <h2>${org.name}</h2>
      <div class="addr">${org.tagline || ""}</div>
      <div class="line"></div>
      <table>
        <tr><td>Receipt No</td><td class="right">${voucherNo || deposit.id || ""}</td></tr>
        <tr><td>Date</td><td class="right">${fmtDate(deposit.date)}</td></tr>
        <tr><td>Member</td><td class="right">${member.name}</td></tr>
        <tr><td>Installment</td><td class="right">${deposit.installmentStep || "—"}</td></tr>
        <tr><td>Method</td><td class="right">${deposit.paymentMethod || ""}</td></tr>
      </table>
      <div class="line"></div>
      <table>
        <tr class="big"><td>Amount</td><td class="right">${money(deposit.amount)}</td></tr>
        ${deposit.fine ? `<tr><td>Fine</td><td class="right">${money(deposit.fine)}</td></tr>` : ""}
      </table>
      <div class="line"></div>
      <div class="center">ধন্যবাদ — Thank you</div>
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
