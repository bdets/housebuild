// Internal Firestore role values (superAdmin / director / admin / member)
// and their permissions/rules are UNCHANGED. Only the text shown to people
// is relabeled: what used to say "Director" now says "Admin", and what
// used to say "Admin" now says "Entry User" — purely cosmetic, so nothing
// else in the app (firestore.rules, the `modules` permission system, the
// role value stored on each account) needed to change.
const ROLE_DISPLAY = {
  superAdmin: { bn: "Super Admin", en: "Super Admin" },
  director: { bn: "এডমিন", en: "Admin" },
  admin: { bn: "এন্ট্রি ইউজার", en: "Entry User" },
  member: { bn: "সাধারণ সদস্য", en: "Member" },
};

export function roleLabel(role, lang) {
  const entry = ROLE_DISPLAY[role];
  if (!entry) return role;
  return entry[lang] || entry.bn;
}
