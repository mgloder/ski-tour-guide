// Service Worker — offline shell + recently-viewed place cache
const SHELL_CACHE = "ski-shell-v2";
const DATA_CACHE  = "ski-data-v2";

const SHELL_URLS = [
  "/",
  "/places",
  "/training",
  "/equipment",
  "/offline",
];

// Install: pre-cache the app shell
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(c =>
      Promise.allSettled(SHELL_URLS.map(u => c.add(u).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== DATA_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   - Navigation requests → network-first, fall back to cached shell "/"
//   - API /api/places?id= (place detail) → cache-first (store when fresh)
//   - Piste data /api/pistes → cache-first (large, rarely changes)
//   - Everything else → network-only (no cache pollution)
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // Piste GeoJSON — cache-first, long TTL
  if (path === "/api/pistes") {
    e.respondWith(
      caches.open(DATA_CACHE).then(async cache => {
        const key = e.request.url;
        const cached = await cache.match(key);
        if (cached) return cached;
        const fresh = await fetch(e.request);
        if (fresh.ok) cache.put(key, fresh.clone());
        return fresh;
      }).catch(() => new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), {
        headers: { "Content-Type": "application/json" },
      }))
    );
    return;
  }

  // Navigation — network-first, offline fallback
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return cache.match("/") ?? new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // Static assets (_next/static) — cache-first, they're content-hashed
  if (path.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(SHELL_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const fresh = await fetch(e.request);
        if (fresh.ok) cache.put(e.request, fresh.clone());
        return fresh;
      })
    );
    return;
  }
});
