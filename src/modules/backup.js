import { db, doc, collection, writeBatch } from "../firebase.js";
import { toast } from "../utils.js";
import { t } from "../i18n.js";
import { BACKUP_COLLECTIONS, SHEET_NAME, fetchAllData, triggerDownload, backupFileStamp } from "../backup-core.js";

export async function render(root, identity) {
  const canImport = identity.role === "superAdmin" || identity.role === "director";

  root.innerHTML = `
    <h1>${t("backup")}</h1>
    <div class="panel">
      <h2>${t("jsonBackup")}</h2>
      <div class="btn-row">
        <button id="jsonExportBtn" class="btn-primary">${t("jsonExport")}</button>
        ${canImport ? `<label class="btn-ghost" style="display:inline-flex;align-items:center;cursor:pointer;">${t("jsonImport")} <input type="file" id="jsonImportInput" accept=".json" style="display:none;" /></label>` : ""}
      </div>
    </div>
    <div class="panel">
      <h2>${t("excelBackup")}</h2>
      <div class="btn-row">
        <button id="excelExportBtn" class="btn-gold">${t("excelExport")}</button>
        ${canImport ? `<label class="btn-ghost" style="display:inline-flex;align-items:center;cursor:pointer;">${t("excelImport")} <input type="file" id="excelImportInput" accept=".xlsx" style="display:none;" /></label>` : ""}
      </div>
      ${!canImport ? `<p class="muted" style="margin-top:10px;">${t("importRestricted")}</p>` : ""}
    </div>
    <div id="backupStatus" class="muted"></div>
  `;

  document.getElementById("jsonExportBtn").addEventListener("click", async () => {
    document.getElementById("backupStatus").textContent = t("loading");
    const data = await fetchAllData();
    triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `${backupFileStamp()}.json`);
    document.getElementById("backupStatus").textContent = "";
    toast(t("saved"));
  });

  document.getElementById("excelExportBtn").addEventListener("click", async () => {
    if (!window.XLSX) {
      toast("Excel library not loaded.", true);
      return;
    }
    document.getElementById("backupStatus").textContent = t("loading");
    const data = await fetchAllData();
    const wb = window.XLSX.utils.book_new();
    for (const name of BACKUP_COLLECTIONS) {
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(data[name]), SHEET_NAME[name]);
    }
    window.XLSX.writeFile(wb, `${backupFileStamp()}.xlsx`);
    document.getElementById("backupStatus").textContent = "";
    toast(t("saved"));
  });

  const jsonImportInput = document.getElementById("jsonImportInput");
  if (jsonImportInput) {
    jsonImportInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm("এই JSON ফাইলের ডেটা বর্তমান ডেটাবেসে যোগ/আপডেট হবে। নিশ্চিত? / This JSON file's data will be added/updated into the current database. Continue?")) {
        e.target.value = "";
        return;
      }
      try {
        await importByCollection(JSON.parse(await file.text()));
        toast(t("saved"));
      } catch (err) {
        toast(err.message || "Import failed.", true);
      }
      e.target.value = "";
    });
  }

  const excelImportInput = document.getElementById("excelImportInput");
  if (excelImportInput) {
    excelImportInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file || !window.XLSX) return;
      if (!confirm("এই Excel ফাইলের ডেটা বর্তমান ডেটাবেসে যোগ/আপডেট হবে। নিশ্চিত? / This Excel file's data will be added/updated into the current database. Continue?")) {
        e.target.value = "";
        return;
      }
      try {
        const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
        const data = {};
        for (const name of BACKUP_COLLECTIONS) {
          const sheetName = SHEET_NAME[name];
          if (wb.Sheets[sheetName]) data[name] = window.XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        }
        await importByCollection(data);
        toast(t("saved"));
      } catch (err) {
        toast(err.message || "Import failed.", true);
      }
      e.target.value = "";
    });
  }

  async function importByCollection(data) {
    document.getElementById("backupStatus").textContent = t("loading");
    for (const name of BACKUP_COLLECTIONS) {
      const rows = data[name];
      if (!Array.isArray(rows) || !rows.length) continue;
      let batch = writeBatch(db);
      let count = 0;
      for (const row of rows) {
        const { _id, ...fields } = row;
        if (_id) batch.set(doc(db, name, String(_id)), fields, { merge: true });
        else batch.set(doc(collection(db, name)), fields);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    }
    document.getElementById("backupStatus").textContent = "";
  }
}
