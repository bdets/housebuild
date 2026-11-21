// ======================================================================
// modal.js — ইন-পেজ হ্যাঁ/না ও কারণ-প্রশ্ন ডায়ালগ (Phase 1A)
// native confirm()/prompt() ব্যবহার করে না: PWA ও কিছু মোবাইল ব্রাউজারে সেগুলো
// নীরবে বন্ধ হয়ে যেত। সব লেখা textContent-এ বসে (HTML নয়)।
// ======================================================================
import { t } from "./i18n.js";

function openDialog({ title, message, field, yesLabel, noLabel, danger = false }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const box = document.createElement("div");
    box.className = "modal-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");

    const h = document.createElement("h3");
    h.textContent = title || "";
    box.appendChild(h);

    if (message) {
      const p = document.createElement("p");
      p.className = "modal-msg";
      p.textContent = message;
      box.appendChild(p);
    }

    let input = null;
    if (field) {
      const lab = document.createElement("label");
      lab.textContent = field.label || "";
      input = document.createElement("textarea");
      input.rows = 3;
      input.maxLength = 300;
      lab.appendChild(input);
      box.appendChild(lab);
    }

    const row = document.createElement("div");
    row.className = "modal-actions";
    const noBtn = document.createElement("button");
    noBtn.type = "button";
    noBtn.className = "btn-ghost";
    noBtn.textContent = noLabel || t("cancel");
    const yesBtn = document.createElement("button");
    yesBtn.type = "button";
    yesBtn.className = danger ? "btn-danger" : "btn-primary";
    yesBtn.textContent = yesLabel || t("yes");
    row.append(noBtn, yesBtn);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const cancelValue = field ? null : false;
    const finish = (v) => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === "Escape") finish(cancelValue);
    };
    document.addEventListener("keydown", onKey);

    noBtn.addEventListener("click", () => finish(cancelValue));
    yesBtn.addEventListener("click", () => {
      if (input) {
        const v = input.value.trim();
        if (!v) {
          input.classList.add("invalid");
          input.focus();
          return;
        }
        finish(v);
      } else {
        finish(true);
      }
    });
    (input || yesBtn).focus();
  });
}

/** হ্যাঁ/না → Promise<boolean> */
export function askConfirm({ title, message, yesLabel, noLabel, danger = false } = {}) {
  return openDialog({ title, message, yesLabel, noLabel, danger, field: null });
}

/** কারণ লিখতে হবে → Promise<string | null> (বাতিল করলে null) */
export function askVoidReason({ title, message, label, yesLabel, noLabel } = {}) {
  return openDialog({
    title, message, yesLabel, noLabel, danger: true,
    field: { label: label || "" },
  });
}
