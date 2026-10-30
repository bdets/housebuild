import { logout } from "./auth.js";
import { t, getLang, setLang } from "./i18n.js";
import { roleLabel } from "./roles.js";

// Leaf items carry `module` (an admin needs that module checked) or
// `directorPlus` (director/superAdmin only) or `staffOnly` (any active
// staff role). Groups/subgroups are just containers — a group shows if at
// least one of its descendant leaves is visible to this person.
const NAV_TREE = [
  { key: "dashboard", labelKey: "dashboard", icon: "🏠", staffOnly: true },

  {
    group: "entrySystem",
    labelKey: "entrySystem",
    icon: "📝",
    items: [
      { key: "shareholder-entry", labelKey: "shareholderEntry", module: "shareholders" },
      { key: "deposits-entry", labelKey: "depositEntry", module: "deposits" },
      { key: "deposits-list", labelKey: "depositList", module: "deposits" },
      { key: "costs-entry", labelKey: "costEntry", module: "costs" },
      { key: "costs-list", labelKey: "costEntryList", module: "costs" },
      { key: "vouchers", labelKey: "voucherEntry", module: "vouchers" },
    ],
  },

  {
    group: "reportsGroup",
    labelKey: "reportsGroup",
    icon: "📊",
    items: [
      {
        subgroup: "incomeGroup",
        labelKey: "incomeGroup",
        items: [
          { key: "rpt-deposit-summary", labelKey: "depositSummary", module: "reports" },
          { key: "rpt-individual-statement", labelKey: "individualStatement", module: "reports" },
          { key: "rpt-shareholders-list", labelKey: "shareholdersList", module: "reports" },
        ],
      },
      {
        subgroup: "expensesGroup",
        labelKey: "expensesGroup",
        items: [
          { key: "rpt-item-wise-summary", labelKey: "itemWiseSummary", module: "reports" },
          { key: "rpt-item-wise-indv", labelKey: "itemWiseCostIndv", module: "reports" },
          { key: "rpt-total-cost", labelKey: "totalCostStatement", module: "reports" },
          { key: "work-items", labelKey: "workItemsList", module: "costs" },
          { key: "rpt-all-benefi", labelKey: "allBenefiPays", module: "reports" },
          { key: "rpt-indv-benefi", labelKey: "indvBenefiPay", module: "reports" },
        ],
      },
      {
        subgroup: "othersGroup",
        labelKey: "othersGroup",
        items: [
          { key: "rpt-assets-liabilities", labelKey: "assetsLiabilities", module: "reports" },
          { key: "set-installments", labelKey: "setInstallments", module: "deposits" },
          { key: "rpt-deposits-dues", labelKey: "depositsDues", module: "reports" },
          { key: "rpt-cash-voucher", labelKey: "cashVoucherReport", module: "reports" },
        ],
      },
    ],
  },

  {
    group: "postsGroup",
    labelKey: "postsGroup",
    icon: "📮",
    items: [
      { key: "notices", labelKey: "meetingOthers", module: "notices" },
      { key: "posts-transferbill", labelKey: "transferBill", module: "posts" },
      { key: "posts-cashvoucher", labelKey: "cashVoucherPost", module: "posts" },
    ],
  },

  { key: "profile", labelKey: "myProfile", icon: "👤" },
  { key: "users", labelKey: "users", icon: "👥", directorPlus: true },
  { key: "reports-approval", labelKey: "reports", icon: "✅", directorPlus: true },
  { key: "messages", labelKey: "messages", icon: "✉️", module: "messages" },
  { key: "backup", labelKey: "backup", icon: "🗄️", staffOnly: true },

  {
    group: "settingsGroup",
    labelKey: "settings",
    icon: "⚙️",
    items: [
      { key: "settings", labelKey: "orgInfo", directorPlus: true },
      { key: "activity-log", labelKey: "activityLog", directorPlus: true },
    ],
  },
];

function canSeeLeaf(item, identity) {
  if (item.directorPlus) return identity.role === "superAdmin" || identity.role === "director";
  if (item.module) {
    return (
      identity.role === "superAdmin" ||
      identity.role === "director" ||
      (identity.role === "admin" && (identity.modules || []).includes(item.module))
    );
  }
  if (item.staffOnly) return ["superAdmin", "director", "admin"].includes(identity.role);
  return true;
}

/** True if a group/subgroup has at least one visible leaf underneath it. */
function groupHasVisibleChild(node, identity) {
  if (node.key) return canSeeLeaf(node, identity); // it's a leaf
  return (node.items || []).some((child) => groupHasVisibleChild(child, identity));
}

function renderNode(node, identity, activeKey) {
  if (node.key) {
    // leaf
    if (!canSeeLeaf(node, identity)) return "";
    return `<a href="?view=${node.key}" data-view="${node.key}" class="${node.key === activeKey ? "active" : ""}">
      ${node.icon ? `<span>${node.icon}</span>` : ""}<span data-label-key="${node.labelKey}">${t(node.labelKey)}</span>
    </a>`;
  }
  // group or subgroup (both use <details>)
  if (!groupHasVisibleChild(node, identity)) return "";
  const childrenHtml = (node.items || []).map((child) => renderNode(child, identity, activeKey)).join("");
  const isSubgroup = !!node.subgroup;
  return `<details class="${isSubgroup ? "nav-subgroup" : "nav-group"}">
    <summary><span>${node.icon ? node.icon + " " : ""}</span><span data-label-key="${node.labelKey}">${t(node.labelKey)}</span></summary>
    <div class="nav-group-body">${childrenHtml}</div>
  </details>`;
}



/**
 * Mounts the sidebar shell ONCE. `onNavigate(key)` is called (click already
 * prevented) whenever a nav leaf is clicked — the router in admin-main.js
 * owns what happens next (swap content, update the URL).
 */
export function renderShell({ activeKey, identity, org, onNavigate }) {
  const navHtml = NAV_TREE.map((node) => renderNode(node, identity, activeKey)).join("");

  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <div class="app-shell">
      <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand" style="display:flex;align-items:center;gap:10px;">
          ${org.logoDataUrl ? `<img id="shellOrgLogo" src="${org.logoDataUrl}" alt="logo" style="width:36px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0;" />` : `<img id="shellOrgLogo" style="display:none;width:36px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0;" />`}
          <div>
            <div class="org-name" id="shellOrgName">${org.name}</div>
            <div class="org-tag" id="shellOrgTag">${org.tagline || ""}</div>
          </div>
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-foot">
          <div class="muted" style="margin-bottom:8px;">${identity.name || identity.email || ""} · ${
      roleLabel(identity.role, getLang())
    }</div>
          <div id="syncStatus" class="muted" style="margin-bottom:8px;font-size:.78rem;"></div>
          <div class="btn-row" style="margin-bottom:8px;">
            <button class="btn-ghost lang-btn" data-lang="bn" style="padding:4px 10px;flex:1;">বাংলা</button>
            <button class="btn-ghost lang-btn" data-lang="en" style="padding:4px 10px;flex:1;">English</button>
          </div>
          <button class="btn-ghost" id="logoutBtn" data-label-key="logout" style="width:100%;">${t("logout")}</button>
        </div>
      </aside>
      <div class="content">
        <div class="topbar"><button class="menu-toggle" id="menuToggle">☰</button></div>
        <div id="viewRoot"></div>
      </div>
    </div>
  `
  );

  document.getElementById("logoutBtn").addEventListener("click", logout);
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  document.getElementById("menuToggle").addEventListener("click", () => {
    sidebar.classList.toggle("open");
    backdrop.classList.toggle("show");
  });
  backdrop.addEventListener("click", () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
  });

  // accordion behavior: opening one group/subgroup collapses its siblings
  // at the same level (but never touches its own parent/children)
  sidebar.querySelectorAll("details").forEach((det) => {
    det.addEventListener("toggle", () => {
      if (!det.open || !det.parentElement) return;
      det.parentElement.querySelectorAll(":scope > details").forEach((sibling) => {
        if (sibling !== det) sibling.open = false;
      });
    });
  });

  // auto-expand whichever group/subgroup contains the currently active leaf
  const activeLink = sidebar.querySelector(`a[data-view="${activeKey}"]`);
  if (activeLink) {
    let el = activeLink.closest("details");
    while (el) {
      el.open = true;
      el = el.parentElement ? el.parentElement.closest("details") : null;
    }
  }

  // SPA navigation: intercept plain left-clicks only, so ctrl/cmd-click or
  // middle-click to "open in new tab" still works normally, and clicking a
  // <summary> to expand/collapse a group doesn't trigger navigation.
  sidebar.querySelector(".sidebar-nav").addEventListener("click", (e) => {
    const link = e.target.closest("a[data-view]");
    if (!link) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
    onNavigate(link.dataset.view);
  });

  sidebar.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === getLang());
    btn.addEventListener("click", () => {
      setLang(btn.dataset.lang);
      onNavigate(activeKey, { relabel: true });
    });
  });

  window.addEventListener("online", () => setSyncStatus(true));
  window.addEventListener("offline", () => setSyncStatus(false));
  setSyncStatus(navigator.onLine);

  return document.getElementById("viewRoot");
}

export function setActiveNavKey(key) {
  document.querySelectorAll(".sidebar-nav a[data-view]").forEach((a) => {
    a.classList.toggle("active", a.dataset.view === key);
  });
  const activeLink = document.querySelector(`a[data-view="${key}"]`);
  if (activeLink) {
    let el = activeLink.closest("details");
    while (el) {
      el.open = true;
      el = el.parentElement ? el.parentElement.closest("details") : null;
    }
  }
}

export function relabelShell() {
  document.querySelectorAll("[data-label-key]").forEach((el) => {
    el.textContent = t(el.dataset.labelKey);
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === getLang());
  });
  setSyncStatus(navigator.onLine);
}

export function updateShellBrand(org) {
  const nameEl = document.getElementById("shellOrgName");
  const tagEl = document.getElementById("shellOrgTag");
  const logoEl = document.getElementById("shellOrgLogo");
  if (nameEl) nameEl.textContent = org.name;
  if (tagEl) tagEl.textContent = org.tagline || "";
  if (logoEl) {
    if (org.logoDataUrl) {
      logoEl.src = org.logoDataUrl;
      logoEl.style.display = "block";
    } else {
      logoEl.style.display = "none";
    }
  }
}

function setSyncStatus(online) {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  el.textContent = online ? t("online") : t("offline");
  el.style.color = online ? "#8fd4a8" : "#e0b36b";
}
