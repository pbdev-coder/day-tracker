const CACHE = "daytracker-v1";
const ASSETS = [
  "/day-tracker/",
  "/day-tracker/index.html",
  "/day-tracker/style.css",
  "/day-tracker/script.js",
  "/day-tracker/manifest.json",
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200",
];

// Install: cache all assets
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch: cache-first for local assets, network-first for others
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isLocal = url.origin === location.origin;

  if (isLocal) {
    // Cache-first for local files
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ||
          fetch(e.request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
            return res;
          }),
      ),
    );
  } else {
    // Network-first for external (fonts etc.)
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  }
});
