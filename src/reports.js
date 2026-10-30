import { db, collection, getDocs, query, where, orderBy, getDoc, doc } from "./firebase.js";
import { getInstallmentPlan } from "./config-lists.js";

/** Whole calendar months elapsed from a 'YYYY-MM-DD' date to `asOf` (0 if not yet passed). */
function monthsLate(fromDateStr, asOf) {
  if (!fromDateStr) return 0;
  const from = new Date(fromDateStr);
  if (isNaN(from) || from > asOf) return 0;
  let months = (asOf.getFullYear() - from.getFullYear()) * 12 + (asOf.getMonth() - from.getMonth());
  if (asOf.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Due, per the installment plan (Set Installments), for one member.
 *
 * Payments are applied to installment steps in order (step 1 must be
 * filled before anything counts toward step 2, etc) rather than matched by
 * the free-text "Details" label on each deposit — the Details field stays
 * free text (the real data has irregular/partial labels), so matching by
 * label would under/over-count. Once a step's Final Date has passed with
 * still-unpaid amount against it, that step's monthly Fine accrues for
 * every whole month since, added to Due, until it's paid off.
 */
export function computeInstallmentDue(member, allDeposits, plan, asOf = new Date()) {
  const share = Number(member.totalShare) || 0;
  const myDeposits = allDeposits.filter((d) => d.memberId === member.id);
  const totalPaid = myDeposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalFinePaid = myDeposits.reduce((s, d) => s + (Number(d.fine) || 0), 0);

  let remainingPaid = totalPaid;
  let totalRequired = 0;
  let accruedFine = 0;

  for (const step of plan) {
    const required = (Number(step.amount) || 0) * share;
    totalRequired += required;
    const appliedToStep = Math.min(remainingPaid, required);
    remainingPaid -= appliedToStep;
    const shortfall = required - appliedToStep;
    if (step.finalDate && shortfall > 0) {
      const late = monthsLate(step.finalDate, asOf);
      if (late > 0) accruedFine += late * (Number(step.fine) || 0);
    }
  }

  const due = totalRequired - totalPaid + accruedFine - totalFinePaid;
  return { due, totalRequired, totalPaid, accruedFine, finePaid: totalFinePaid };
}

/**
 * Pulls members/deposits/costs and computes balances fresh every time —
 * no stored running totals that can go stale. Only ever called by
 * director/admin (with the `deposits`/`costs`/`members` modules), whose
 * Firestore rules allow reading the full collections — so this naturally
 * stays within the "selective sync" boundary per role.
 */
export async function computeBalanceSummary() {
  const [membersSnap, depositsSnap, costsSnap, plan] = await Promise.all([
    getDocs(query(collection(db, "users"), where("role", "==", "member"))),
    getDocs(collection(db, "deposits")),
    getDocs(collection(db, "costs")),
    getInstallmentPlan(),
  ]);

  const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const deposits = depositsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const costs = costsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const totalShares = members.reduce((s, m) => s + (Number(m.totalShare) || 0), 0);
  const totalDeposit = deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalFine = deposits.reduce((s, d) => s + (Number(d.fine) || 0), 0);
  const totalCost = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  // "cost per share" stays as an informational construction-cost stat — it
  // no longer drives Due, which now comes from the installment plan above.
  const costPerShare = totalShares > 0 ? totalCost / totalShares : 0;
  const bankBalance = totalDeposit + totalFine - totalCost;

  const perMember = members
    .map((m) => {
      const { due, totalRequired, totalPaid } = computeInstallmentDue(m, deposits, plan);
      return {
        memberId: m.id,
        slno: m.slno,
        idNo: m.idNo,
        mobile: m.mobile,
        name: m.name,
        share: m.totalShare,
        demand: totalRequired,
        deposit: totalPaid,
        due,
      };
    })
    .sort((a, b) => (a.slno || 0) - (b.slno || 0));

  return { totalShares, totalDeposit, totalFine, totalCost, costPerShare, bankBalance, perMember };
}

/**
 * Deposit Summary report: per-member totals of amount/fine/total within a
 * date range (inclusive) — matches the society's original "Deposit Summary"
 * sheet. Pass startDate/endDate as 'YYYY-MM-DD' strings, or omit either for
 * an open-ended range.
 */
export async function computeDepositSummary(startDate, endDate) {
  const [membersSnap, depositsSnap] = await Promise.all([
    getDocs(query(collection(db, "users"), where("role", "==", "member"))),
    getDocs(collection(db, "deposits")),
  ]);
  const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.slno || 0) - (b.slno || 0));
  const deposits = depositsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => (!startDate || d.date >= startDate) && (!endDate || d.date <= endDate));

  const rows = members.map((m) => {
    const mine = deposits.filter((d) => d.memberId === m.id);
    const amount = mine.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const fine = mine.reduce((s, d) => s + (Number(d.fine) || 0), 0);
    return { idNo: m.idNo, slno: m.slno, name: m.name, amount, fine, total: amount + fine };
  });

  const grand = rows.reduce(
    (acc, r) => ({ amount: acc.amount + r.amount, fine: acc.fine + r.fine, total: acc.total + r.total }),
    { amount: 0, fine: 0, total: 0 }
  );

  return { rows, grand, startDate, endDate };
}

/**
 * Item-wise Summary report: costs grouped by item within a date range —
 * matches the society's original "Item wise summary" sheet.
 */
export async function computeItemWiseSummary(startDate, endDate) {
  const snap = await getDocs(collection(db, "costs"));
  const costs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => (!startDate || c.date >= startDate) && (!endDate || c.date <= endDate));

  const byItem = new Map();
  for (const c of costs) {
    const key = c.item || "—";
    byItem.set(key, (byItem.get(key) || 0) + (Number(c.amount) || 0));
  }
  const rows = [...byItem.entries()].map(([item, amount]) => ({ item, amount })).sort((a, b) => a.item.localeCompare(b.item));
  const grandTotal = rows.reduce((s, r) => s + r.amount, 0);

  return { rows, grandTotal, startDate, endDate };
}

/** All cost entries, newest first — "Total Cost Statement" (a flat ledger, not grouped). */
export async function getTotalCostStatement(startDate, endDate) {
  const snap = await getDocs(query(collection(db, "costs"), orderBy("date", "desc")));
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => (!startDate || c.date >= startDate) && (!endDate || c.date <= endDate));
  const grandTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return { rows, grandTotal, startDate, endDate };
}

/** One cost item's individual entries — "Item Wise Cost Indv." drill-down. */
export async function getItemWiseIndividual(item, startDate, endDate) {
  const snap = await getDocs(collection(db, "costs"));
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(
      (c) =>
        c.item === item && (!startDate || c.date >= startDate) && (!endDate || c.date <= endDate)
    )
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const grandTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return { item, rows, grandTotal, startDate, endDate };
}

/** Every beneficiary's total payments — "All Benefi. Pays". */
export async function getAllBeneficiaryPayments(startDate, endDate) {
  const snap = await getDocs(collection(db, "costs"));
  const costs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => (!startDate || c.date >= startDate) && (!endDate || c.date <= endDate));

  const byBeneficiary = new Map();
  for (const c of costs) {
    const key = c.beneficiary || "—";
    byBeneficiary.set(key, (byBeneficiary.get(key) || 0) + (Number(c.amount) || 0));
  }
  const rows = [...byBeneficiary.entries()]
    .map(([beneficiary, amount]) => ({ beneficiary, amount }))
    .sort((a, b) => a.beneficiary.localeCompare(b.beneficiary));
  const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
  return { rows, grandTotal, startDate, endDate };
}

/** One beneficiary's individual payment history — "Indv. Benefi. Pay". */
export async function getBeneficiaryStatement(beneficiary, startDate, endDate) {
  const snap = await getDocs(collection(db, "costs"));
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(
      (c) =>
        c.beneficiary === beneficiary &&
        (!startDate || c.date >= startDate) &&
        (!endDate || c.date <= endDate)
    )
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const grandTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return { beneficiary, rows, grandTotal, startDate, endDate };
}

/** List of distinct beneficiary names seen so far — for the picker dropdown. */
export async function getKnownBeneficiaries() {
  const snap = await getDocs(collection(db, "costs"));
  const names = new Set(snap.docs.map((d) => d.data().beneficiary).filter(Boolean));
  return [...names].sort();
}

/**
 * Assets & Liabilities — a simple balance-sheet view: deposits (+fines) are
 * the society's liability to its members, costs are what's been spent
 * (converted to asset value under construction), bank balance is the
 * residual cash position.
 */
export async function computeAssetsLiabilities() {
  const summary = await computeBalanceSummary();
  return {
    liabilities: [
      { label: "Member Deposits", amount: summary.totalDeposit },
      { label: "Fines Collected", amount: summary.totalFine },
    ],
    totalLiabilities: summary.totalDeposit + summary.totalFine,
    assets: [{ label: "Construction Cost to Date", amount: summary.totalCost }],
    totalAssets: summary.totalCost,
    bankBalance: summary.bankBalance,
    costPerShare: summary.costPerShare,
  };
}

/** A simpler due-only cut of the balance summary (no ID/mobile/share columns). */
export async function computeDepositsAndDues() {
  const summary = await computeBalanceSummary();
  return {
    rows: summary.perMember.map((m) => ({ name: m.name, deposit: m.deposit, due: m.due })),
    totalDeposit: summary.totalDeposit,
    totalDue: summary.perMember.reduce((s, m) => s + m.due, 0),
  };
}

/** Combined voucher + cheque register — "Cash Voucher" report under Others. */
export async function getCashVoucherReport() {
  const [vSnap, cSnap] = await Promise.all([
    getDocs(query(collection(db, "vouchers"), orderBy("date", "desc"))),
    getDocs(query(collection(db, "cheques"), orderBy("date", "desc"))),
  ]);
  const vouchers = vSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const cheques = cSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const totalVouchers = vouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const totalCheques = cheques.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  return { vouchers, cheques, totalVouchers, totalCheques };
}

/** Full deposit history + member profile — used by the Individual Deposit Statement report. */
export async function getMemberStatementData(memberId) {
  const [profileSnap, depositsSnap] = await Promise.all([
    getDoc(doc(db, "users", memberId)),
    getDocs(query(collection(db, "deposits"), where("memberId", "==", memberId), orderBy("date", "desc"))),
  ]);
  const profile = profileSnap.exists() ? { id: profileSnap.id, ...profileSnap.data() } : null;
  const deposits = depositsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
  return { profile, deposits };
}

/**
 * A MEMBER's own summary, computed only from the documents their role is
 * allowed to read (their own users/{uid} doc + their own deposits query) —
 * never touches the full members/deposits/costs collections, so it works
 * under the member-tier Firestore rules and keeps the offline cache small.
 */
export async function computeOwnMemberSummary(uid) {
  const [profileSnap, depositsSnap, plan] = await Promise.all([
    getDoc(doc(db, "users", uid)),
    getDocs(query(collection(db, "deposits"), where("memberId", "==", uid), orderBy("date", "desc"))),
    getInstallmentPlan(), // config/installmentPlan is publicly readable — see firestore.rules
  ]);

  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const deposits = depositsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
  const { due, totalRequired, totalPaid } = computeInstallmentDue({ id: uid, totalShare: profile.totalShare }, deposits, plan);

  return {
    name: profile.name,
    share: profile.totalShare,
    deposits,
    deposit: totalPaid,
    demand: totalRequired,
    due,
  };
}
