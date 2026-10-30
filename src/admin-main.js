import { guardPage } from "./auth.js";
import { renderShell, setActiveNavKey, relabelShell } from "./ui-shell.js";
import { getOrg } from "./org-store.js";
import { t } from "./i18n.js";

const REPORT_KEYS = [
  "rpt-deposit-summary",
  "rpt-individual-statement",
  "rpt-shareholders-list",
  "rpt-item-wise-summary",
  "rpt-item-wise-indv",
  "rpt-total-cost",
  "rpt-all-benefi",
  "rpt-indv-benefi",
  "rpt-assets-liabilities",
  "rpt-deposits-dues",
  "rpt-cash-voucher",
];

const VIEW_CONFIG = {
  dashboard: { loader: () => import("./modules/dashboard.js"), fn: "render", staffOnly: true },

  "shareholder-entry": { loader: () => import("./modules/shareholder-entry.js"), fn: "render", module: "shareholders" },
  "deposits-entry": { loader: () => import("./modules/deposits.js"), fn: "renderEntry", module: "deposits" },
  "deposits-list": { loader: () => import("./modules/deposits.js"), fn: "renderList", module: "deposits" },
  "costs-entry": { loader: () => import("./modules/costs.js"), fn: "renderEntry", module: "costs" },
  "costs-list": { loader: () => import("./modules/costs.js"), fn: "renderList", module: "costs" },
  vouchers: { loader: () => import("./modules/vouchers.js"), fn: "render", module: "vouchers" },

  "work-items": { loader: () => import("./modules/work-items-config.js"), fn: "render", module: "costs" },
  "set-installments": { loader: () => import("./modules/installments-config.js"), fn: "render", module: "deposits" },

  notices: { loader: () => import("./modules/notices.js"), fn: "render", module: "notices" },
  "posts-transferbill": { loader: () => import("./modules/posts.js"), fn: "render", module: "posts", arg: "transferbill" },
  "posts-cashvoucher": { loader: () => import("./modules/posts.js"), fn: "render", module: "posts", arg: "cashvoucher" },

  profile: { loader: () => import("./modules/profile.js"), fn: "render" },
  users: { loader: () => import("./modules/users.js"), fn: "render", directorPlus: true },
  "reports-approval": { loader: () => import("./modules/reports-approval.js"), fn: "render", directorPlus: true },
  messages: { loader: () => import("./modules/messages.js"), fn: "render", module: "messages" },
  backup: { loader: () => import("./modules/backup.js"), fn: "render", staffOnly: true },
  settings: { loader: () => import("./modules/settings.js"), fn: "render", directorPlus: true },
  "activity-log": { loader: () => import("./modules/activity-log.js"), fn: "render", directorPlus: true },
};

// all 11 "rpt-*" report leaves share one module file (statements.js) and
// pass their own key through as the 3rd render() argument
for (const key of REPORT_KEYS) {
  VIEW_CONFIG[key] = { loader: () => import("./modules/statements.js"), fn: "render", module: "reports", arg: key };
}

function canAccess(cfg, identity) {
  if (cfg.directorPlus) return ["superAdmin", "director"].includes(identity.role);
  if (cfg.module) {
    return (
      identity.role === "superAdmin" ||
      identity.role === "director" ||
      (identity.role === "admin" && (identity.modules || []).includes(cfg.module))
    );
  }
  if (cfg.staffOnly) return ["superAdmin", "director", "admin"].includes(identity.role);
  return true;
}

guardPage(["superAdmin", "director", "admin"], async (identity) => {
  const org = await getOrg();
  let viewRoot;
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

    viewRoot.style.opacity = "0";

    const cfg = VIEW_CONFIG[key] || VIEW_CONFIG.dashboard;
    if (!canAccess(cfg, identity)) {
      viewRoot.innerHTML = `<div class="empty-state">${
        cfg.directorPlus ? t("directorOnlyPage") : t("noModuleAccess")
      }</div>`;
    } else {
      const mod = await cfg.loader();
      const renderFn = mod[cfg.fn] || mod.render;
      await renderFn(viewRoot, identity, cfg.arg);
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
