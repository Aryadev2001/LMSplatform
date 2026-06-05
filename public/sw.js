/* eurodigital.coach — self-destroying service worker (kill-switch).
 *
 * The previous service worker cached assets cache-first under a fixed,
 * never-versioned cache name and stored responses regardless of status.
 * After a deploy that could strand a browser on stale/broken `_next/static`
 * chunks: the page rendered (HTML is fetched fresh) but its JavaScript never
 * hydrated, so every button/onClick on the page was dead.
 *
 * This replacement intercepts NOTHING (no `fetch` handler → the browser loads
 * everything straight from the network), purges every cache, unregisters
 * itself, and reloads any open tab once so existing visitors recover without
 * a manual hard-refresh. Browsers that still have the old SW pick this up via
 * the normal service-worker update check on their next navigation — even if
 * the page's own JavaScript is too broken to run.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
      await self.clients.claim();
      // Reload controlled tabs once so they drop the stale, SW-served assets
      // and pull a clean copy from the network.
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.navigate(client.url);
        }
      } catch {
        /* ignore */
      }
    })(),
  );
});
