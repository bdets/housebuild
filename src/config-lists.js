import { db, doc, getDoc, setDoc } from "./firebase.js";

const DEFAULT_COST_ITEMS = [
  "Design (Structural & Architectural)",
  "CDA Plan & Others",
  "Pilling",
  "Steel (Rod)",
  "Sand",
  "Bricks",
  "Cement",
  "Electrical",
];

const DEFAULT_INSTALLMENT_STEPS = [
  { name: "1st Installment", targetAmount: 0, fine: 0 },
  { name: "2nd Installment", targetAmount: 0, fine: 0 },
  { name: "3rd Installment", targetAmount: 0, fine: 0 },
];

/** Reads config/costItems (Work Items List); falls back to sensible defaults. */
export async function getCostItems() {
  const snap = await getDoc(doc(db, "config", "costItems"));
  if (snap.exists() && Array.isArray(snap.data().items) && snap.data().items.length) {
    return snap.data().items;
  }
  return DEFAULT_COST_ITEMS;
}

export async function saveCostItems(items) {
  await setDoc(doc(db, "config", "costItems"), { items });
}

/** Reads config/installmentPlan (Set Installments); falls back to sensible defaults. */
export async function getInstallmentPlan() {
  const snap = await getDoc(doc(db, "config", "installmentPlan"));
  if (snap.exists() && Array.isArray(snap.data().steps) && snap.data().steps.length) {
    return snap.data().steps;
  }
  return DEFAULT_INSTALLMENT_STEPS;
}

export async function saveInstallmentPlan(steps) {
  await setDoc(doc(db, "config", "installmentPlan"), { steps });
}
