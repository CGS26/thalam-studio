const CACHE_VERSION = "tala-lab-v2";
const APP_SHELL = [
  "./",
  "./manifest.webmanifest",
  "./favicon.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (
          await caches.match(request)
          ?? await caches.match("./")
          ?? Response.error()
        )),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok) return response;
        const copy = response.clone();
        void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(async () => (
        await caches.match(request)
        ?? Response.error()
      )),
  );
});
