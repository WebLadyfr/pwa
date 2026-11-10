/* Service worker : coquille d'app hors-ligne.
 * RÈGLES DE CONFIDENTIALITÉ : jamais de cache pour /api/* (produits, photos d'étiquettes),
 * aucune donnée utilisateur n'est mise en cache. */
const CACHE = "hs-shell-v2";
const PRECACHE = ["/offline.html", "/theme-init.js", "/icons/icon-192.png"];
const CACHEABLE_PAGES = new Set(["/", "/search", "/label", "/favorites", "/history", "/settings", "/onboarding", "/privacy", "/terms", "/legal"]);

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // jamais de cache cross-origin
  if (url.pathname.startsWith("/api/")) return; // réseau uniquement

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && CACHEABLE_PAGES.has(url.pathname)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/offline.html"))),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/theme-init.js" || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
