/* eurodigital.coach service worker — minimal, safe.
   Only touches same-origin GETs: network-first for navigations (offline →
   cached shell), cache-first for static assets. API/auth/cross-origin
   (Clerk, Blob, payment gateways) are never intercepted. */
const CACHE = "edc-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/")).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave Clerk/Blob/etc alone
  if (url.pathname.startsWith("/api/")) return; // never cache API/auth

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/")));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(css|js|woff2?|png|svg|jpe?g|webp|ico)$/.test(url.pathname)
  ) {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((ch) => ch.put(req, copy)).catch(() => {});
            return res;
          }),
      ),
    );
  }
});
