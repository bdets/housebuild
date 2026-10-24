import { db, collection, getDocs, doc, setDoc, updateDoc, query, orderBy } from "../firebase.js";
import { createStaffOrMemberAccount, requestPasswordReset } from "../auth.js";
import { randomPassword, toast } from "../utils.js";
import { t, getLang } from "../i18n.js";

const MODULE_OPTIONS = [
  { key: "deposits", bn: "ডিপোজিট / কিস্তি", en: "Deposits / Installments" },
  { key: "costs", bn: "খরচ / ব্যয়", en: "Costs / Expenses" },
  { key: "vouchers", bn: "ভাউচার / চেক", en: "Vouchers / Cheques" },
  { key: "notices", bn: "নোটিশ", en: "Notices" },
  { key: "reports", bn: "রিপোর্ট (জেনারেট + জমা, অনুমোদন ছাড়া)", en: "Reports (generate + submit, no approval power)" },
  { key: "messages", bn: "বার্তা", en: "Messages" },
];

const ROLE_LABEL = { director: "Director", admin: "Admin", member: { bn: "সাধারণ সদস্য", en: "Member" } };

export async function render(root, identity) {
  const en = getLang() === "en";
  root.innerHTML = `
    <h1>${t("users")}</h1>
    <p class="muted">${en ? "Create a new Director/Admin/Member account. Your own login session stays active." : "নতুন Director/Admin/সদস্য অ্যাকাউন্ট তৈরি করুন। (তোমার নিজের লগইন সেশন অক্ষুণ্ণ থাকবে।)"}</p>

    <div class="panel">
      <h2>${t("newAccount")}</h2>
      <form id="userForm" class="form-grid">
        <div><label>${t("role")} *</label>
          <select name="role" id="roleSelect" required>
            ${identity.role === "superAdmin" ? `<option value="director">Director</option>` : ""}
            <option value="admin">Admin</option>
            <option value="member">${en ? "Member" : "সাধারণ সদস্য"}</option>
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

  function roleLabel(role) {
    if (role === "member") return en ? "Member" : "সাধারণ সদস্য";
    return ROLE_LABEL[role] || role;
  }

  async function loadUsers() {
    const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const tbody = document.getElementById("userRows");
    tbody.innerHTML = users
      .map(
        (u) => `<tr>
        <td>${u.name || ""}</td>
        <td>${roleLabel(u.role)}</td>
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
      toast(en ? "Account created." : "অ্যাকাউন্ট তৈরি হয়েছে।");
      alert(
        (en ? "Account created.\n\nEmail: " : "অ্যাকাউন্ট তৈরি হয়েছে।\n\nইমেইল: ") +
          fd.get("email") +
          (en ? "\nPassword: " : "\nপাসওয়ার্ড: ") +
          password +
          (en
            ? "\n\nWrite/copy this down now — it won't be shown again."
            : "\n\nএটা এখনই লিখে/কপি করে রাখো — পরে আর এখান থেকে দেখা যাবে না।")
      );
      e.target.reset();
      toggleFields();
      loadUsers();
    } catch (err) {
      toast(err.message || (en ? "Failed." : "ব্যর্থ হয়েছে।"), true);
    }
  });

  loadUsers();
}
