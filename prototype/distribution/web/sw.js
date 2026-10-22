/* Le cache concerne uniquement les ressources publiques du prototype, jamais les brouillons. */
const PREFIX = "builder-mail-prototype-" + encodeURIComponent(self.registration.scope) + "-";
const CACHE = PREFIX + "61ddec62895690f4";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
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
