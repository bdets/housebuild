import { db, DEFAULT_ORG, doc, getDoc } from "./firebase.js";

let cached = null;
let inflight = null;

/**
 * Returns the current org info. First call fetches config/org from
 * Firestore (merged over the defaults in src/config.js, so a field nobody
 * has set yet still shows something sensible); later calls reuse the
 * cached copy until invalidateOrg() is called (Settings does this right
 * after saving).
 */
export async function getOrg(forceRefresh = false) {
  if (cached && !forceRefresh) return cached;
  if (inflight && !forceRefresh) return inflight;

  inflight = (async () => {
    try {
      const snap = await getDoc(doc(db, "config", "org"));
      cached = snap.exists() ? { ...DEFAULT_ORG, ...snap.data() } : DEFAULT_ORG;
    } catch (e) {
      cached = DEFAULT_ORG; // offline on first-ever load, etc.
    }
    inflight = null;
    return cached;
  })();

  return inflight;
}

/** Synchronous best-guess for places that render before the async fetch resolves. */
export function getCachedOrg() {
  return cached || DEFAULT_ORG;
}

/** Call after Settings saves config/org so the next getOrg() re-fetches. */
export function invalidateOrg() {
  cached = null;
}
