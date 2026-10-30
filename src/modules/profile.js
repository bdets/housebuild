import { changeOwnPassword } from "../auth.js";
import { toast } from "../utils.js";
import { t, getLang } from "../i18n.js";
import { roleLabel } from "../roles.js";
import { logActivity } from "../activity.js";

export async function render(root, identity) {
  const en = getLang() === "en";
  root.innerHTML = `
    <h1>${t("myProfile")}</h1>
    <div class="panel">
      <p><strong>${t("name")}:</strong> ${identity.name || ""}</p>
      <p><strong>${t("email")}:</strong> ${identity.email || ""}</p>
      <p><strong>${t("role")}:</strong> ${roleLabel(identity.role, en ? "en" : "bn")}</p>
    </div>
    <div class="panel">
      <h2>${t("changePassword")}</h2>
      <form id="pwForm" class="form-grid">
        <div><label>${t("currentPassword")} *</label><input type="password" name="current" required /></div>
        <div><label>${t("newPassword")} *</label><input type="password" name="next" minlength="6" required /></div>
        <div><label>${t("confirmNewPassword")} *</label><input type="password" name="confirm" minlength="6" required /></div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("changePassword")}</button></div>
      </form>
    </div>
  `;

  document.getElementById("pwForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const current = fd.get("current");
    const next = fd.get("next");
    const confirm = fd.get("confirm");
    if (next !== confirm) {
      toast(t("passwordMismatch"), true);
      return;
    }
    try {
      await changeOwnPassword(current, next);
      logActivity(identity, "password_changed");
      toast(t("passwordChanged"));
      e.target.reset();
    } catch (err) {
      toast(err.message || (en ? "Failed." : "ব্যর্থ হয়েছে।"), true);
    }
  });
}
