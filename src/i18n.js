// Lightweight i18n: a flat key -> {bn, en} dictionary + a t() helper.
// Language choice persists in localStorage and defaults to Bengali.

const DICT = {
  // nav / shell
  dashboard: { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  deposits: { bn: "ডিপোজিট / কিস্তি", en: "Deposits / Installments" },
  costs: { bn: "খরচ / ব্যয়", en: "Costs / Expenses" },
  vouchers: { bn: "ভাউচার / চেক", en: "Vouchers / Cheques" },
  notices: { bn: "নোটিশ", en: "Notices" },
  reports: { bn: "রিপোর্ট অনুমোদন", en: "Report Approval" },
  users: { bn: "ইউজার ম্যানেজমেন্ট", en: "User Management" },
  messages: { bn: "বার্তা", en: "Messages" },
  backup: { bn: "ব্যাকআপ", en: "Backup" },
  settings: { bn: "সেটিংস", en: "Settings" },
  logout: { bn: "লগ আউট", en: "Log out" },
  online: { bn: "●  অনলাইন (সিঙ্ক হচ্ছে)", en: "●  Online (syncing)" },
  offline: { bn: "●  অফলাইন (পরে সিঙ্ক হবে)", en: "●  Offline (will sync later)" },

  // common actions
  save: { bn: "সংরক্ষণ করুন", en: "Save" },
  submit: { bn: "জমা দিন", en: "Submit" },
  delete: { bn: "মুছুন", en: "Delete" },
  edit: { bn: "সম্পাদনা", en: "Edit" },
  cancel: { bn: "বাতিল", en: "Cancel" },
  close: { bn: "বন্ধ করুন", en: "Close" },
  confirmDelete: { bn: "এই এন্ট্রিটি মুছে ফেলবেন?", en: "Delete this entry?" },
  deleted: { bn: "মুছে ফেলা হয়েছে।", en: "Deleted." },
  saved: { bn: "সংরক্ষিত হয়েছে।", en: "Saved." },
  noEntries: { bn: "এখনো কোনো এন্ট্রি নেই।", en: "No entries yet." },
  filterByMember: { bn: "সদস্য দিয়ে ফিল্টার করুন", en: "Filter by member" },
  filterByItem: { bn: "খাত দিয়ে ফিল্টার করুন", en: "Filter by item" },
  everyone: { bn: "-- সবাই --", en: "-- Everyone --" },
  allItems: { bn: "-- সব খাত --", en: "-- All items --" },
  selectMember: { bn: "-- নির্বাচন করুন --", en: "-- Select --" },

  // field labels
  date: { bn: "তারিখ", en: "Date" },
  member: { bn: "সদস্য", en: "Member" },
  installment: { bn: "কিস্তি", en: "Installment" },
  method: { bn: "মাধ্যম", en: "Method" },
  amount: { bn: "পরিমাণ", en: "Amount" },
  fine: { bn: "জরিমানা", en: "Fine" },
  remarks: { bn: "মন্তব্য", en: "Remarks" },
  item: { bn: "খাত", en: "Item" },
  beneficiary: { bn: "প্রাপক", en: "Beneficiary" },
  chequeNo: { bn: "চেক নং", en: "Cheque No" },
  chalanNo: { bn: "চালান নং", en: "Chalan No" },
  voucherNo: { bn: "ভাউচার নং", en: "Voucher No" },
  description: { bn: "বিবরণ", en: "Description" },
  name: { bn: "নাম", en: "Name" },
  email: { bn: "ইমেইল", en: "Email" },
  mobile: { bn: "মোবাইল", en: "Mobile" },
  role: { bn: "রোল", en: "Role" },
  status: { bn: "স্ট্যাটাস", en: "Status" },
  share: { bn: "শেয়ার", en: "Share" },
  due: { bn: "বকেয়া", en: "Due" },

  // dashboard
  liveCalcNote: { bn: "লাইভ ক্যালকুলেশন — কোনো পুরনো/স্ট্যাল ডেটা নয়।", en: "Live calculation — never stale data." },
  totalDeposit: { bn: "মোট জমা", en: "Total Deposit" },
  totalFine: { bn: "মোট জরিমানা", en: "Total Fine" },
  totalCost: { bn: "মোট খরচ", en: "Total Cost" },
  bankBalance: { bn: "ব্যাংক ব্যালেন্স", en: "Bank Balance" },
  totalShares: { bn: "মোট শেয়ার", en: "Total Shares" },
  costPerShare: { bn: "শেয়ার প্রতি খরচ", en: "Cost per Share" },
  demand: { bn: "দাবি", en: "Demand" },
  duesByMember: { bn: "সদস্য অনুযায়ী বকেয়া", en: "Dues by Member" },
  exportReportPdf: { bn: "A4 রিপোর্ট PDF", en: "A4 Report PDF" },

  // login
  loginTitle: { bn: "লগইন", en: "Log in" },
  password: { bn: "পাসওয়ার্ড", en: "Password" },
  forgotPassword: { bn: "পাসওয়ার্ড ভুলে গেছেন?", en: "Forgot password?" },
  firstTimeSetup: { bn: "প্রথমবার সেটআপ করছেন?", en: "Setting up for the first time?" },
  signupAsSuperAdmin: { bn: "Super Admin হিসেবে সাইন-আপ করুন", en: "Sign up as Super Admin" },
  directorOnlyPage: { bn: "এই পাতাটি শুধু Director/Super Admin-এর জন্য।", en: "This page is for Director/Super Admin only." },
  noModuleAccess: { bn: "এই মডিউলে তোমার অ্যাক্সেস নেই — Director-এর সাথে যোগাযোগ করো।", en: "You don't have access to this module — contact your Director." },

  // generic form/section chrome
  newEntry: { bn: "নতুন এন্ট্রি", en: "New Entry" },
  allEntries: { bn: "সব এন্ট্রি", en: "All Entries" },
  paymentMethod: { bn: "পেমেন্ট মাধ্যম", en: "Payment Method" },
  notSpecified: { bn: "-- (নির্দিষ্ট নয়) --", en: "-- (not specified) --" },
  printReceiptAfterSave: { bn: "জমার পর রিসিট প্রিন্ট করুন (থার্মাল)", en: "Print receipt after saving (thermal)" },
  printReceipt: { bn: "রিসিট প্রিন্ট", en: "Print Receipt" },
  a4Print: { bn: "A4 প্রিন্ট", en: "A4 Print" },
  loading: { bn: "লোড হচ্ছে...", en: "Loading..." },

  // vouchers
  newVoucher: { bn: "নতুন ভাউচার", en: "New Voucher" },
  allVouchers: { bn: "সব ভাউচার", en: "All Vouchers" },
  chequeRegister: { bn: "চেক রেজিস্টার", en: "Cheque Register" },
  addCheque: { bn: "চেক যোগ করুন", en: "Add Cheque" },
  relatedVoucherNo: { bn: "সংশ্লিষ্ট ভাউচার নং", en: "Related Voucher No" },
  noVouchersYet: { bn: "এখনো কোনো ভাউচার নেই।", en: "No vouchers yet." },
  noChequesYet: { bn: "এখনো কোনো চেক নেই।", en: "No cheques yet." },

  // notices
  newNotice: { bn: "নতুন নোটিশ", en: "New Notice" },
  allNotices: { bn: "সব নোটিশ", en: "All Notices" },
  title: { bn: "শিরোনাম", en: "Title" },
  details: { bn: "বিস্তারিত", en: "Details" },
  audience: { bn: "কাদের জন্য", en: "Audience" },
  forEveryone: { bn: "সবার জন্য (সদস্য ও স্টাফ)", en: "Everyone (members & staff)" },
  forMembersOnly: { bn: "শুধু সদস্যদের জন্য", en: "Members only" },
  forStaffOnly: { bn: "শুধু স্টাফদের জন্য", en: "Staff only" },
  publishNow: { bn: "এখনই প্রকাশ করুন", en: "Publish now" },
  keepDraft: { bn: "ড্রাফট রাখুন", en: "Keep as draft" },
  publish: { bn: "প্রকাশ করুন", en: "Publish" },
  unpublish: { bn: "আড়াল করুন", en: "Unpublish" },
  published: { bn: "প্রকাশিত", en: "Published" },
  draft: { bn: "ড্রাফট", en: "Draft" },
  noNoticesYet: { bn: "এখনো কোনো নোটিশ নেই।", en: "No notices yet." },

  // reports (approval)
  submitReport: { bn: "নতুন রিপোর্ট জমা দিন", en: "Submit a New Report" },
  reportType: { bn: "ধরন", en: "Type" },
  periodTitle: { bn: "শিরোনাম/মেয়াদ", en: "Title / Period" },
  summaryNote: { bn: "সারসংক্ষেপ / নোট", en: "Summary / Notes" },
  submitForApproval: { bn: "জমা দিন (অনুমোদনের জন্য)", en: "Submit (for approval)" },
  allReports: { bn: "সব রিপোর্ট", en: "All Reports" },
  approveBtn: { bn: "অনুমোদন করুন", en: "Approve" },
  rejectBtn: { bn: "বাতিল করুন", en: "Reject" },
  noReportsYet: { bn: "এখনো কোনো রিপোর্ট নেই।", en: "No reports yet." },
  incomeExpense: { bn: "আয়-ব্যয় বিবরণী", en: "Income–Expense Statement" },
  cashReport: { bn: "ক্যাশ রিপোর্ট", en: "Cash Report" },
  assetsLiabilities: { bn: "Assets & Liabilities", en: "Assets & Liabilities" },
  pendingApproval: { bn: "অনুমোদনের অপেক্ষায়", en: "Pending approval" },
  approved: { bn: "অনুমোদিত (সদস্যরা দেখতে পাবে)", en: "Approved (members can see)" },
  rejected: { bn: "বাতিল", en: "Rejected" },

  // users / accounts
  newAccount: { bn: "নতুন অ্যাকাউন্ট", en: "New Account" },
  allAccounts: { bn: "সব অ্যাকাউন্ট", en: "All Accounts" },
  createAccount: { bn: "অ্যাকাউন্ট তৈরি করুন", en: "Create Account" },
  moduleAccess: { bn: "Admin-এর জন্য মডিউল অ্যাক্সেস", en: "Module access for this Admin" },
  slno: { bn: "ক্রমিক নং", en: "Serial No" },
  idNo: { bn: "ID", en: "ID" },
  totalShare: { bn: "মোট শেয়ার", en: "Total Share" },
  activateAccount: { bn: "সক্রিয় করুন", en: "Activate" },
  deactivateAccount: { bn: "নিষ্ক্রিয় করুন", en: "Deactivate" },
  resetPwEmail: { bn: "পাসওয়ার্ড রিসেট ইমেইল", en: "Password Reset Email" },
  activeStatus: { bn: "সক্রিয়", en: "Active" },
  inactiveStatus: { bn: "নিষ্ক্রিয়", en: "Inactive" },

  // messages
  noMessagesYet: { bn: "এখনো কোনো বার্তা আসেনি।", en: "No messages yet." },
  answeredStatus: { bn: "উত্তর দেওয়া হয়েছে", en: "Answered" },
  pendingStatus: { bn: "অপেক্ষমান", en: "Pending" },
  writeReply: { bn: "উত্তর লিখুন...", en: "Write a reply..." },
  sendBtn: { bn: "পাঠান", en: "Send" },

  // backup
  jsonBackup: { bn: "JSON ব্যাকআপ", en: "JSON Backup" },
  excelBackup: { bn: "Excel ব্যাকআপ", en: "Excel Backup" },
  jsonExport: { bn: "JSON এক্সপোর্ট", en: "JSON Export" },
  jsonImport: { bn: "JSON ইম্পোর্ট", en: "JSON Import" },
  excelExport: { bn: "Excel এক্সপোর্ট", en: "Excel Export" },
  excelImport: { bn: "Excel ইম্পোর্ট", en: "Excel Import" },
  importRestricted: { bn: "ইম্পোর্ট শুধু Super Admin/Director করতে পারবেন।", en: "Only Super Admin/Director can import." },

  // generated reports (statements)
  statements: { bn: "রিপোর্ট জেনারেট", en: "Generate Reports" },
  depositSummary: { bn: "ডিপোজিট সামারি", en: "Deposit Summary" },
  individualStatement: { bn: "ব্যক্তিগত ডিপোজিট স্টেটমেন্ট", en: "Individual Deposit Statement" },
  shareholdersList: { bn: "শেয়ারহোল্ডার লিস্ট", en: "Shareholders List" },
  itemWiseSummary: { bn: "আইটেম-ভিত্তিক সামারি", en: "Item-wise Summary" },
  startDate: { bn: "শুরুর তারিখ", en: "Start date" },
  endDate: { bn: "শেষের তারিখ", en: "End date" },
  generate: { bn: "তৈরি করুন", en: "Generate" },
  downloadPdf: { bn: "A4 PDF ডাউনলোড", en: "Download A4 PDF" },
  grandTotal: { bn: "সর্বমোট", en: "Grand Total" },
  pickMember: { bn: "-- একজন সদস্য বেছে নিন --", en: "-- Pick a member --" },
};

let lang = (typeof localStorage !== "undefined" && localStorage.getItem("lang")) || "bn";

export function getLang() {
  return lang;
}

export function setLang(l) {
  lang = l === "en" ? "en" : "bn";
  try {
    localStorage.setItem("lang", lang);
  } catch (e) {}
  document.documentElement.lang = lang === "bn" ? "bn" : "en";
}

/** Translate a dictionary key. Falls back to the key itself if missing. */
export function t(key) {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] || entry.bn || key;
}

setLang(lang); // apply the saved/default language to <html lang> on load
