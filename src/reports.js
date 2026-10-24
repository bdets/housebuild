import { db, collection, getDocs, query, where, orderBy, getDoc, doc } from "./firebase.js";

/**
 * Pulls members/deposits/costs and computes balances fresh every time —
 * no stored running totals that can go stale. Only ever called by
 * director/admin (with the `deposits`/`costs`/`members` modules), whose
 * Firestore rules allow reading the full collections — so this naturally
 * stays within the "selective sync" boundary per role.
 */
export async function computeBalanceSummary() {
  const [membersSnap, depositsSnap, costsSnap] = await Promise.all([
    getDocs(query(collection(db, "users"), where("role", "==", "member"))),
    getDocs(collection(db, "deposits")),
    getDocs(collection(db, "costs")),
  ]);

  const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const deposits = depositsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const costs = costsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const totalShares = members.reduce((s, m) => s + (Number(m.totalShare) || 0), 0);
  const totalDeposit = deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalFine = deposits.reduce((s, d) => s + (Number(d.fine) || 0), 0);
  const totalCost = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const costPerShare = totalShares > 0 ? totalCost / totalShares : 0;
  const bankBalance = totalDeposit + totalFine - totalCost;

  const perMember = members
    .map((m) => {
      const myDeposits = deposits.filter((d) => d.memberId === m.id);
      const myTotal = myDeposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);
      const demand = costPerShare * (Number(m.totalShare) || 0);
      return {
        memberId: m.id,
        slno: m.slno,
        idNo: m.idNo,
        mobile: m.mobile,
        name: m.name,
        share: m.totalShare,
        demand,
        deposit: myTotal,
        due: demand - myTotal,
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
  const [profileSnap, depositsSnap, orgCostPerShareSnap] = await Promise.all([
    getDoc(doc(db, "users", uid)),
    getDocs(query(collection(db, "deposits"), where("memberId", "==", uid), orderBy("date", "desc"))),
    getDoc(doc(db, "config", "costPerShare")).catch(() => null),
  ]);

  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const deposits = depositsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
  const totalDeposit = deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  // cost-per-share is published by staff (see modules/dashboard.js) to
  // config/costPerShare since a member can't read the full costs collection
  const costPerShare = orgCostPerShareSnap && orgCostPerShareSnap.exists() ? orgCostPerShareSnap.data().value || 0 : 0;
  const demand = costPerShare * (Number(profile.totalShare) || 0);

  return {
    name: profile.name,
    share: profile.totalShare,
    deposits,
    deposit: totalDeposit,
    demand,
    due: demand - totalDeposit,
  };
}
