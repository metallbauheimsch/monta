// MONTA – minimaler App-Shell-Service-Worker (Sprint: Lager-Offline-Praxis).
//
// Zweck: NUR die statischen App-Ressourcen (HTML/JS/CSS/Icons) offline
// verfügbar machen, damit MONTA nach einem vorbereiteten Offline-Modus
// überhaupt starten kann. Die eigentlichen Projektdaten kommen NICHT von
// hier, sondern aus dem separat gespeicherten IndexedDB-Snapshot (siehe
// src/services/offlineSnapshot.js) - dieser Worker fasst niemals
// Supabase-/API-Antworten an (fremde Origin wird bewusst ausgeschlossen),
// damit nie versehentlich veraltete Serverdaten als aktuell ausgeliefert
// werden.
//
// Strategie: "Cache, was tatsächlich benutzt wird" (Network-first mit
// Cache-Fallback) - kein Build-Schritt nötig, der die von Vite gehashten
// Dateinamen im Voraus kennen müsste. Bewusst kein PWA-Framework, kein
// Precache-Manifest - kleine, nachvollziehbare Lösung.

const CACHE_NAME = "monta-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Nie fremde Origins cachen (insbesondere Supabase) - sonst könnten
  // veraltete API-Antworten offline fälschlich als aktuell erscheinen.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = (await cache.match("/index.html")) || (await cache.match("/"));
          if (shell) return shell;
        }
        throw err;
      }
    })
  );
});
