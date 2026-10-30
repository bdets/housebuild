import { db, collection, getDocs, query, orderBy } from "../firebase.js";
import { fmtDate, toast } from "../utils.js";
import { t, getLang } from "../i18n.js";
import { roleLabel } from "../roles.js";

const ACTION_LABEL = {
  login: { bn: "লগইন", en: "Login" },
  logout: { bn: "লগ আউট", en: "Logout" },
  deposit_added: { bn: "ডিপোজিট যোগ", en: "Deposit Added" },
  cost_added: { bn: "কস্ট যোগ", en: "Cost Added" },
  voucher_added: { bn: "ভাউচার যোগ", en: "Voucher Added" },
  cheque_added: { bn: "চেক যোগ", en: "Cheque Added" },
  notice_added: { bn: "নোটিশ যোগ", en: "Notice Added" },
  post_added: { bn: "পোস্ট যোগ", en: "Post Added" },
  account_created: { bn: "অ্যাকাউন্ট তৈরি", en: "Account Created" },
  account_activated: { bn: "অ্যাকাউন্ট সক্রিয়", en: "Account Activated" },
  account_deactivated: { bn: "অ্যাকাউন্ট নিষ্ক্রিয়", en: "Account Deactivated" },
  password_changed: { bn: "পাসওয়ার্ড পরিবর্তন", en: "Password Changed" },
  org_settings_changed: { bn: "সেটিংস পরিবর্তন", en: "Settings Changed" },
  app_expiry_changed: { bn: "অ্যাপের মেয়াদ পরিবর্তন", en: "App Expiry Changed" },
  installment_plan_changed: { bn: "কিস্তি প্ল্যান পরিবর্তন", en: "Installment Plan Changed" },
  work_items_changed: { bn: "আইটেম তালিকা পরিবর্তন", en: "Work Items Changed" },
  shareholder_profile_updated: { bn: "শেয়ারহোল্ডার প্রোফাইল আপডেট", en: "Shareholder Profile Updated" },
};

export async function render(root) {
  const en = getLang() === "en";
  root.innerHTML = `
    <h1>${t("activityLog")}</h1>
    <p class="muted">${en ? "Super Admin's own actions are never logged here." : "Super Admin-এর নিজের কোনো কাজ এখানে লগ হয় না।"}</p>
    <div class="panel"><div id="logList"></div></div>
  `;

  try {
    const snap = await getDocs(query(collection(db, "activityLog"), orderBy("createdAt", "desc")));
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, 300);
    const list = document.getElementById("logList");
    if (!logs.length) {
      list.innerHTML = `<div class="empty-state">${t("noLogsYet")}</div>`;
      return;
    }
    list.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>${t("when")}</th><th>${t("by")}</th><th>${t("role")}</th><th>${t("action")}</th><th>${t("remarks")}</th></tr></thead>
        <tbody>
          ${logs
            .map(
              (l) => `<tr>
              <td>${fmtDate(l.createdAt)}</td>
              <td>${l.name || ""}</td>
              <td>${roleLabel(l.role, en ? "en" : "bn")}</td>
              <td>${(ACTION_LABEL[l.action] && ACTION_LABEL[l.action][en ? "en" : "bn"]) || l.action}</td>
              <td>${l.details || ""}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table></div>
    `;
  } catch (err) {
    toast(err.message || (en ? "Couldn't load the log." : "লগ লোড করা যায়নি।"), true);
  }
}
