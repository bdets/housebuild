import { db, collection, getDocs, doc, setDoc, updateDoc, query, orderBy } from "../firebase.js";
import { createStaffOrMemberAccount, requestPasswordReset } from "../auth.js";
import { randomPassword, toast } from "../utils.js";
import { t, getLang } from "../i18n.js";
import { roleLabel } from "../roles.js";
import { logActivity } from "../activity.js";

const MODULE_OPTIONS = [
  { key: "shareholders", bn: "শেয়ার হোল্ডার এন্ট্রি", en: "Shareholder Entry" },
  { key: "deposits", bn: "ডিপোজিট / কিস্তি", en: "Deposits / Installments" },
  { key: "costs", bn: "খরচ / ব্যয়", en: "Costs / Expenses" },
  { key: "vouchers", bn: "ভাউচার / চেক", en: "Vouchers / Cheques" },
  { key: "notices", bn: "নোটিশ / মিটিং & আদার্স", en: "Notices / Meeting & Others" },
  { key: "reports", bn: "রিপোর্ট (জেনারেট + জমা, অনুমোদন ছাড়া)", en: "Reports (generate + submit, no approval power)" },
  { key: "posts", bn: "পোস্টস (ট্রান্সফার বিল / ক্যাশ ভাউচার)", en: "Posts (Transfer Bill / Cash Voucher)" },
  { key: "messages", bn: "বার্তা", en: "Messages" },
];

export async function render(root, identity) {
  const en = getLang() === "en";
  root.innerHTML = `
    <h1>${t("users")}</h1>
    <p class="muted">${en ? `Create a new ${roleLabel("director","en")}/${roleLabel("admin","en")}/${roleLabel("member","en")} account. Your own login session stays active.` : `নতুন ${roleLabel("director","bn")}/${roleLabel("admin","bn")}/${roleLabel("member","bn")} অ্যাকাউন্ট তৈরি করুন। (তোমার নিজের লগইন সেশন অক্ষুণ্ণ থাকবে।)`}</p>

    <div class="panel">
      <h2>${t("newAccount")}</h2>
      <form id="userForm" class="form-grid">
        <div><label>${t("role")} *</label>
          <select name="role" id="roleSelect" required>
            ${identity.role === "superAdmin" ? `<option value="director">${roleLabel("director", en ? "en" : "bn")}</option>` : ""}
            <option value="admin">${roleLabel("admin", en ? "en" : "bn")}</option>
            <option value="member">${roleLabel("member", en ? "en" : "bn")}</option>
          </select>
        </div>
        <div><label>${t("name")} *</label><input type="text" name="name" required /></div>
        <div><label>${t("email")} *</label><input type="email" name="email" required /></div>
        <div><label>${t("mobile")}</label><input type="text" name="mobile" /></div>
        <div id="memberOnlyFields" style="display:contents;">
          <div><label>${t("slno")}</label><input type="number" name="slno" /></div>
          <div><label>${t("idNo")}</label><input type="text" name="idNo" /></div>
          <div><label>${t("totalShare")}</label><input type="number" step="0.5" name="totalShare" value="1" /></div>
        </div>
        <div id="moduleField" style="grid-column:1/-1;display:none;">
          <label>${t("moduleAccess")}</label>
          <div style="display:flex;flex-wrap:wrap;gap:12px;">
            ${MODULE_OPTIONS.map(
              (m) => `<label style="display:flex;align-items:center;gap:6px;font-weight:400;">
                <input type="checkbox" name="modules" value="${m.key}" style="width:auto;" />${en ? m.en : m.bn}
              </label>`
            ).join("")}
          </div>
        </div>
        <div style="grid-column:1/-1" class="btn-row"><button type="submit" class="btn-primary">${t("createAccount")}</button></div>
        <p class="muted" style="grid-column:1/-1;">${
          en
            ? "A random password is auto-generated — it'll show on screen once created, copy it and share it (or they can use \"Forgot password\" to set their own)."
            : "একটা র‍্যান্ডম পাসওয়ার্ড অটো-জেনারেট হবে — তৈরি হওয়ার পর স্ক্রিনে দেখাবে, কপি করে সংশ্লিষ্ট ব্যক্তিকে জানিয়ে দাও (অথবা সে নিজে \"পাসওয়ার্ড রিসেট\" লিংক দিয়ে বদলে নিতে পারবে)।"
        }</p>
      </form>
      <div id="newAccountReveal" class="panel" style="display:none;margin-top:14px;background:var(--gold-soft);border-color:var(--gold);">
        <h3>${en ? "Account created — copy these now" : "অ্যাকাউন্ট তৈরি হয়েছে — এখনই কপি করে রাখো"}</h3>
        <p class="muted" style="margin-bottom:8px;">${en ? "This won't be shown again." : "এটা আর পরে এখান থেকে দেখা যাবে না।"}</p>
        <div class="form-grid">
          <div><label>${t("email")}</label><input type="text" id="revealEmail" readonly /></div>
          <div><label>${t("password")}</label><input type="text" id="revealPassword" readonly /></div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn-gold" id="copyCredsBtn">${en ? "Copy both" : "দুটোই কপি করো"}</button>
          <button type="button" class="btn-ghost" id="closeRevealBtn">${t("close")}</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <h2>${t("allAccounts")}</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("name")}</th><th>${t("role")}</th><th>${t("email")}</th><th>${en ? "Modules" : "মডিউল"}</th><th>${t("status")}</th><th></th></tr></thead>
        <tbody id="userRows"></tbody>
      </table></div>
    </div>
  `;

  const roleSelect = document.getElementById("roleSelect");
  function toggleFields() {
    const role = roleSelect.value;
    document.getElementById("memberOnlyFields").style.display = role === "member" ? "contents" : "none";
    document.getElementById("moduleField").style.display = role === "admin" ? "block" : "none";
  }
  roleSelect.addEventListener("change", toggleFields);
  toggleFields();

  function roleLabelLocal(role) {
    return roleLabel(role, en ? "en" : "bn");
  }

  async function loadUsers() {
    const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const tbody = document.getElementById("userRows");
    tbody.innerHTML = users
      .map(
        (u) => `<tr>
        <td>${u.name || ""}</td>
        <td>${roleLabelLocal(u.role)}</td>
        <td>${u.email || ""}</td>
        <td>${(u.modules || []).join(", ") || "—"}</td>
        <td>${u.active === false ? "🔴 " + t("inactiveStatus") : "🟢 " + t("activeStatus")}</td>
        <td>
          <button class="btn-ghost" data-toggle="${u.id}" data-active="${u.active !== false}" style="padding:4px 10px;">
            ${u.active === false ? t("activateAccount") : t("deactivateAccount")}
          </button>
          <button class="btn-ghost" data-reset="${u.email}" style="padding:4px 10px;">${t("resetPwEmail")}</button>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const makeActive = btn.dataset.active === "false";
        await updateDoc(doc(db, "users", btn.dataset.toggle), { active: makeActive });
        logActivity(identity, makeActive ? "account_activated" : "account_deactivated", btn.dataset.toggle);
        toast(
          makeActive
            ? en
              ? "Account activated."
              : "অ্যাকাউন্ট সক্রিয় করা হয়েছে।"
            : en
            ? "Account deactivated — this user can no longer log in."
            : "অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে — এই ইউজার আর লগইন করতে পারবে না।"
        );
        loadUsers();
      });
    });
    tbody.querySelectorAll("[data-reset]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await requestPasswordReset(btn.dataset.reset);
          toast(en ? "Password reset email sent." : "পাসওয়ার্ড রিসেট ইমেইল পাঠানো হয়েছে।");
        } catch (err) {
          toast(err.message || (en ? "Failed." : "ব্যর্থ হয়েছে।"), true);
        }
      });
    });
  }

  document.getElementById("userForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const role = fd.get("role");
    const password = randomPassword();
    try {
      const newUid = await createStaffOrMemberAccount(fd.get("email"), password);
      const profile = {
        role,
        name: fd.get("name"),
        mobile: fd.get("mobile") || "",
        active: true,
        createdAt: new Date().toISOString(),
      };
      if (role === "admin") profile.modules = fd.getAll("modules");
      if (role === "member") {
        profile.slno = fd.get("slno") ? Number(fd.get("slno")) : null;
        profile.idNo = fd.get("idNo") || "";
        profile.totalShare = Number(fd.get("totalShare")) || 0;
      }
      await setDoc(doc(db, "users", newUid), profile);
      logActivity(identity, "account_created", `${role}: ${fd.get("name")}`);
      toast(en ? "Account created." : "অ্যাকাউন্ট তৈরি হয়েছে।");

      document.getElementById("revealEmail").value = fd.get("email");
      document.getElementById("revealPassword").value = password;
      const revealBox = document.getElementById("newAccountReveal");
      revealBox.style.display = "block";
      revealBox.scrollIntoView({ behavior: "smooth", block: "nearest" });

      e.target.reset();
      toggleFields();
      loadUsers();
    } catch (err) {
      toast(err.message || (en ? "Failed." : "ব্যর্থ হয়েছে।"), true);
    }
  });

  document.getElementById("copyCredsBtn").addEventListener("click", async () => {
    const email = document.getElementById("revealEmail").value;
    const password = document.getElementById("revealPassword").value;
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
      toast(en ? "Copied." : "কপি হয়েছে।");
    } catch (err) {
      toast(en ? "Couldn't copy — select and copy manually." : "কপি করা যায়নি — সিলেক্ট করে ম্যানুয়ালি কপি করো।", true);
    }
  });
  document.getElementById("closeRevealBtn").addEventListener("click", () => {
    document.getElementById("newAccountReveal").style.display = "none";
  });

  loadUsers();
}
