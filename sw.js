// Bump this on every deploy that changes cached files, so old clients
// pick up the new shell instead of serving a stale cached version forever.
const CACHE_NAME = "society-shell-v1";

// Relative paths (not "/index.html" etc) so this still works correctly
// when the site is served from a sub-path, e.g. GitHub Pages project sites
// at username.github.io/repo-name/ rather than the domain root.
const SHELL_FILES = [
  "./",
  "./index.html",
  "./admin.html",
  "./member.html",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Strategy: network-first for navigations/API (so you always get fresh data
// when online), falling back to the cached shell when offline. Firestore's
// own IndexedDB persistence (see src/firebase.js) handles DATA offline —
// this service worker only needs to handle the static HTML/CSS/JS shell so
// the app's UI itself still loads with no network at all.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
  );
});
