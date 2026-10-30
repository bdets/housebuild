import { getCostItems, saveCostItems } from "../config-lists.js";
import { toast } from "../utils.js";
import { logActivity } from "../activity.js";
import { t, getLang } from "../i18n.js";

export async function render(root, identity) {
  const en = getLang() === "en";
  let items = await getCostItems();

  function paint() {
    root.innerHTML = `
      <h1>${t("workItemsList")}</h1>
      <p class="muted">${
        en
          ? "This is the dropdown list on the Cost Entry form. Add, rename, or remove items here."
          : "এটা Cost Entry ফর্মের ড্রপডাউন তালিকা। এখান থেকে আইটেম যোগ/নাম বদল/মুছে ফেলা যাবে।"
      }</p>

      <div class="panel">
        <h2>${t("workItems")}</h2>
        <div id="itemsList">
          ${
            items.length
              ? items
                  .map(
                    (item, i) => `<div class="form-grid" style="margin-bottom:8px;grid-template-columns:1fr auto;">
                    <input type="text" data-idx="${i}" value="${item}" />
                    <button class="btn-danger" data-del="${i}" style="padding:8px 14px;">${t("delete")}</button>
                  </div>`
                  )
                  .join("")
              : `<div class="empty-state">${t("noItemsYet")}</div>`
          }
        </div>
        <div class="form-grid" style="margin-top:10px;">
          <div><label>${t("itemName")}</label><input type="text" id="newItemInput" /></div>
        </div>
        <div class="btn-row" style="margin-top:12px;">
          <button id="addItemBtn" class="btn-ghost">${t("addItem")}</button>
          <button id="saveItemsBtn" class="btn-primary">${t("save")}</button>
        </div>
      </div>
    `;

    root.querySelectorAll("input[data-idx]").forEach((input) => {
      input.addEventListener("input", () => {
        items[Number(input.dataset.idx)] = input.value;
      });
    });
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        items.splice(Number(btn.dataset.del), 1);
        paint();
      });
    });
    document.getElementById("addItemBtn").addEventListener("click", () => {
      const val = document.getElementById("newItemInput").value.trim();
      if (!val) return;
      items.push(val);
      paint();
    });
    document.getElementById("saveItemsBtn").addEventListener("click", async () => {
      await saveCostItems(items.filter(Boolean));
      logActivity(identity, "work_items_changed");
      toast(t("saved"));
    });
  }

  paint();
}
