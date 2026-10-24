import { guardPage } from "./auth.js";
import { renderShell, setActiveNavKey, relabelShell } from "./ui-shell.js";
import { getOrg } from "./org-store.js";
import { t } from "./i18n.js";

const VIEW_MODULES = {
  dashboard: () => import("./modules/dashboard.js"),
  deposits: () => import("./modules/deposits.js"),
  costs: () => import("./modules/costs.js"),
  vouchers: () => import("./modules/vouchers.js"),
  notices: () => import("./modules/notices.js"),
  statements: () => import("./modules/statements.js"),
  reports: () => import("./modules/reports-approval.js"),
  users: () => import("./modules/users.js"),
  messages: () => import("./modules/messages.js"),
  backup: () => import("./modules/backup.js"),
  settings: () => import("./modules/settings.js"),
};

const DIRECTOR_PLUS_VIEWS = ["reports", "users", "settings"];
const MODULE_FOR_VIEW = { deposits: "deposits", costs: "costs", vouchers: "vouchers", notices: "notices", messages: "messages", statements: "reports" };

guardPage(["superAdmin", "director", "admin"], async (identity) => {
  const org = await getOrg();
  let viewRoot; // (re)assigned below, referenced by loadView via closure
  let currentKey = new URLSearchParams(window.location.search).get("view") || "dashboard";

  viewRoot = renderShell({
    activeKey: currentKey,
    identity,
    org,
    onNavigate: (key, opts) => {
      if (!opts || !opts.relabel) {
        history.pushState(null, "", `?view=${key}`);
      }
      loadView(key, { relabel: !!(opts && opts.relabel) });
    },
  });

  async function loadView(key, { relabel = false } = {}) {
    currentKey = key;
    setActiveNavKey(key);
    if (relabel) relabelShell();

    // simple fade: content swaps instantly (no navigation/reload) but gets
    // a brief opacity transition so it doesn't feel like a hard jump-cut
    viewRoot.style.opacity = "0";

    if (DIRECTOR_PLUS_VIEWS.includes(key) && !["superAdmin", "director"].includes(identity.role)) {
      viewRoot.innerHTML = `<div class="empty-state">${t("directorOnlyPage")}</div>`;
    } else {
      const moduleNeeded = MODULE_FOR_VIEW[key];
      if (moduleNeeded && identity.role === "admin" && !(identity.modules || []).includes(moduleNeeded)) {
        viewRoot.innerHTML = `<div class="empty-state">${t("noModuleAccess")}</div>`;
      } else {
        const loader = VIEW_MODULES[key] || VIEW_MODULES.dashboard;
        const mod = await loader();
        await mod.render(viewRoot, identity);
      }
    }

    requestAnimationFrame(() => {
      viewRoot.style.transition = "opacity .15s ease";
      viewRoot.style.opacity = "1";
    });
  }

  window.addEventListener("popstate", () => {
    const key = new URLSearchParams(window.location.search).get("view") || "dashboard";
    loadView(key);
  });

  await loadView(currentKey);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
