import { logout } from "./auth.js";
import { t, getLang, setLang } from "./i18n.js";

const NAV_ITEMS = [
  { key: "dashboard", labelKey: "dashboard", icon: "🏠", staffOnly: true },
  { key: "deposits", labelKey: "deposits", icon: "💰", module: "deposits" },
  { key: "costs", labelKey: "costs", icon: "🧾", module: "costs" },
  { key: "vouchers", labelKey: "vouchers", icon: "📑", module: "vouchers" },
  { key: "notices", labelKey: "notices", icon: "📢", module: "notices" },
  { key: "statements", labelKey: "statements", icon: "📈", module: "reports" },
  { key: "reports", labelKey: "reports", icon: "📊", directorPlus: true },
  { key: "users", labelKey: "users", icon: "👥", directorPlus: true },
  { key: "messages", labelKey: "messages", icon: "✉️", module: "messages" },
  { key: "backup", labelKey: "backup", icon: "🗄️", staffOnly: true },
  { key: "settings", labelKey: "settings", icon: "⚙️", directorPlus: true },
];

function canSee(item, identity) {
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

const ROLE_LABEL = { superAdmin: "Super Admin", director: "Director", admin: "Admin" };

/**
 * Mounts the sidebar shell ONCE. `onNavigate(key)` is called (with the
 * click already prevented from doing a real page load) whenever the person
 * clicks a nav link — the router in admin-main.js owns what happens next
 * (swap the content, update the URL via history.pushState). This is what
 * makes menu clicks instant instead of a full-page flash/reload.
 */
export function renderShell({ activeKey, identity, org, onNavigate }) {
  const items = NAV_ITEMS.filter((i) => canSee(i, identity));
  const navHtml = items
    .map(
      (i) => `<a href="?view=${i.key}" data-view="${i.key}" class="${i.key === activeKey ? "active" : ""}">
        <span>${i.icon}</span><span data-label-key="${i.labelKey}">${t(i.labelKey)}</span></a>`
    )
    .join("");

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
      ROLE_LABEL[identity.role] || identity.role
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

  // ---- SPA navigation: intercept plain left-clicks only, so ctrl/cmd-click
  // or middle-click to "open in new tab" still works normally ----
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
      onNavigate(activeKey, { relabel: true }); // re-render current view + shell text in the new language
    });
  });

  window.addEventListener("online", () => setSyncStatus(true));
  window.addEventListener("offline", () => setSyncStatus(false));
  setSyncStatus(navigator.onLine);

  return document.getElementById("viewRoot");
}

/** Call after a route change so the correct nav item is highlighted. */
export function setActiveNavKey(key) {
  document.querySelectorAll(".sidebar-nav a[data-view]").forEach((a) => {
    a.classList.toggle("active", a.dataset.view === key);
  });
}

/** Re-apply nav labels, footer button, and lang toggle highlight after a language switch. */
export function relabelShell() {
  document.querySelectorAll("[data-label-key]").forEach((el) => {
    el.textContent = t(el.dataset.labelKey);
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === getLang());
  });
  setSyncStatus(navigator.onLine);
}

/** Call after Settings saves config/org — updates the sidebar brand with no reload. */
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
