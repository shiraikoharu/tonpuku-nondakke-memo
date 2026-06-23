const CACHE_NAME = "tonpuku-count-memo-cache-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./index.html?v=11",
  "./styles.css?v=11",
  "./app.js?v=11",
  "./manifest.json?v=11",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isFreshFirst =
    event.request.mode === "navigate"
    || requestUrl.pathname.endsWith("/index.html")
    || requestUrl.pathname.endsWith("/styles.css")
    || requestUrl.pathname.endsWith("/app.js")
    || requestUrl.pathname.endsWith("/manifest.json")
    || requestUrl.pathname.endsWith("/sw.js");

  if (isFreshFirst) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => (
      cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    ))
  );
});
