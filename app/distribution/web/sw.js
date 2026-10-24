const PREFIX = "atelier-courriels-" + encodeURIComponent(self.registration.scope) + "-";
const CACHE = PREFIX + "1360ab11065e7abd";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(url => new Request(url, {cache: "reload"}))))));
self.addEventListener("message", event => { if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting(); });
self.addEventListener("activate", event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url), scope = new URL(self.registration.scope);
  if (event.request.method !== "GET" || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const entry = event.request.mode === "navigate" && [scope.pathname, scope.pathname + "index.html"].includes(url.pathname);
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(entry ? new URL("index.html", scope).href : event.request)) || fetch(event.request)));
});
