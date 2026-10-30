import { getInstallmentPlan, saveInstallmentPlan } from "../config-lists.js";
import { toast } from "../utils.js";
import { logActivity } from "../activity.js";
import { t, getLang } from "../i18n.js";

export async function render(root, identity) {
  const en = getLang() === "en";
  let steps = await getInstallmentPlan();

  function paint() {
    root.innerHTML = `
      <h1>${t("setInstallments")}</h1>
      <p class="muted">${
        en
          ? '"Amount" is the required amount per share. If a share is still short of that amount after its Final Date passes, the Fine (per month) is added to that shareholder\'s Due automatically, every month, until it\'s paid.'
          : '"Amount" হলো প্রতি শেয়ারের জন্য নির্ধারিত অংক। Final Date পার হয়ে গেলে যদি কোনো শেয়ার তখনো এই অংক পূরণ না হয়, তাহলে Fine (প্রতি মাসে) স্বয়ংক্রিয়ভাবে সেই শেয়ারহোল্ডারের Due-তে যোগ হতে থাকবে, যতদিন না বকেয়া কিস্তি মেটানো হয়।'
      }</p>

      <div class="panel">
        <h2>${t("installmentSteps")}</h2>
        <div class="table-wrap"><table>
          <thead><tr>
            <th>${en ? "Serial" : "ক্রমিক"}</th>
            <th>${t("stepName")}</th>
            <th class="num">${t("targetAmount")}</th>
            <th>${en ? "Initial Date" : "প্রাথমিক তারিখ"}</th>
            <th>${en ? "Final Date" : "শেষ তারিখ"}</th>
            <th class="num">${t("fine")} (${en ? "per month" : "প্রতি মাসে"})</th>
            <th>${t("remarks")}</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${steps
              .map(
                (s, i) => `<tr>
                <td>${i + 1}</td>
                <td><input type="text" data-field="name" data-idx="${i}" value="${s.name || ""}" style="min-width:120px;" /></td>
                <td class="num"><input type="number" data-field="amount" data-idx="${i}" value="${s.amount || 0}" style="text-align:right;min-width:90px;" /></td>
                <td><input type="date" data-field="initialDate" data-idx="${i}" value="${s.initialDate || ""}" /></td>
                <td><input type="date" data-field="finalDate" data-idx="${i}" value="${s.finalDate || ""}" /></td>
                <td class="num"><input type="number" data-field="fine" data-idx="${i}" value="${s.fine || 0}" style="text-align:right;min-width:80px;" /></td>
                <td><input type="text" data-field="remarks" data-idx="${i}" value="${s.remarks || ""}" style="min-width:100px;" /></td>
                <td><button class="btn-danger" data-del="${i}" style="padding:4px 10px;">${t("delete")}</button></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table></div>
        <div class="btn-row" style="margin-top:12px;">
          <button id="addStepBtn" class="btn-ghost">${t("addStep")}</button>
          <button id="saveStepsBtn" class="btn-primary">${t("save")}</button>
        </div>
      </div>
    `;

    root.querySelectorAll("input[data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const i = Number(input.dataset.idx);
        const field = input.dataset.field;
        steps[i][field] = ["amount", "fine"].includes(field) ? Number(input.value) || 0 : input.value;
      });
    });
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        steps.splice(Number(btn.dataset.del), 1);
        paint();
      });
    });
    document.getElementById("addStepBtn").addEventListener("click", () => {
      steps.push({
        name: `${steps.length + 1}${en ? "th" : "ম"} Installment`,
        amount: 0,
        initialDate: "",
        finalDate: "",
        fine: 0,
        remarks: "",
      });
      paint();
    });
    document.getElementById("saveStepsBtn").addEventListener("click", async () => {
      await saveInstallmentPlan(steps);
      logActivity(identity, "installment_plan_changed");
      toast(t("saved"));
    });
  }

  paint();
}
