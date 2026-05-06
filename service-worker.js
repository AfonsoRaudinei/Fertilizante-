const CACHE_NAME = "fert-calc-v8";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/css/variables.css",
  "/css/app.css",
  "/css/components.css",
  "/js/app.js",
  "/js/storage.js",
  "/js/ui.js",
  "/js/events.js",
  "/js/import-parser.js",
  "/js/router.js",
  "/solver/formulas.js",
  "/solver/logistics.js",
  "/solver/ranking.js",
  "/solver/solver.js",
  "/ai/context-builder.js",
  "/ai/openrouter.js",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (event.request.method !== "GET") {
            return networkResponse;
          }

          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
          return networkResponse;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
