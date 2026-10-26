import { getInstallmentPlan, saveInstallmentPlan } from "../config-lists.js";
import { toast } from "../utils.js";
import { t, getLang } from "../i18n.js";

export async function render(root) {
  const en = getLang() === "en";
  let steps = await getInstallmentPlan();

  function paint() {
    root.innerHTML = `
      <h1>${t("setInstallments")}</h1>
      <p class="muted">${
        en
          ? "This list feeds the \"Details\" suggestions on the Deposit Entry form, alongside whatever members have actually paid before."
          : "এই তালিকা Deposit Entry ফর্মের \"বিস্তারিত\" সাজেশনে দেখাবে, সদস্যরা আগে যা লিখেছে তার পাশাপাশি।"
      }</p>

      <div class="panel">
        <h2>${t("installmentSteps")}</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>${t("stepName")}</th><th class="num">${t("targetAmount")}</th><th class="num">${t("fine")}</th><th></th></tr></thead>
          <tbody>
            ${steps
              .map(
                (s, i) => `<tr>
                <td><input type="text" data-field="name" data-idx="${i}" value="${s.name || ""}" /></td>
                <td class="num"><input type="number" data-field="targetAmount" data-idx="${i}" value="${s.targetAmount || 0}" style="text-align:right;" /></td>
                <td class="num"><input type="number" data-field="fine" data-idx="${i}" value="${s.fine || 0}" style="text-align:right;" /></td>
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
        steps[i][field] = field === "name" ? input.value : Number(input.value) || 0;
      });
    });
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        steps.splice(Number(btn.dataset.del), 1);
        paint();
      });
    });
    document.getElementById("addStepBtn").addEventListener("click", () => {
      steps.push({ name: `${steps.length + 1}${en ? "th" : "ম"} Installment`, targetAmount: 0, fine: 0 });
      paint();
    });
    document.getElementById("saveStepsBtn").addEventListener("click", async () => {
      await saveInstallmentPlan(steps);
      toast(t("saved"));
    });
  }

  paint();
}
