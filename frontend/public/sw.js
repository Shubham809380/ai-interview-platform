const APP_CACHE = "ai-interview-app-v1";
const ASSET_CACHE = "ai-interview-assets-v1";
const API_CACHE = "ai-interview-api-v1";
const ALL_CACHES = [APP_CACHE, ASSET_CACHE, API_CACHE];
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/mini-logo.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!ALL_CACHES.includes(key)) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response(
      JSON.stringify({
        message: "Offline mode: no cached API data available for this request."
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  return cached || networkPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedIndex = await caches.match("/index.html");
        return cachedIndex || caches.match("/");
      })
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
