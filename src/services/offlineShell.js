// App-Shell-Vorbereitung für den Offline-Modus (Sprint: Lager-Offline-
// Praxis, GPT-Review-Korrektur "Offline-Startgarantie").
//
// GPT-Review-Befund: der bisherige Service Worker cachte nur beiläufig
// ("Cache, was tatsächlich benutzt wird"), ohne beim Klick auf
// "Offline-Modus vorbereiten" sicherzustellen, dass die für einen echten
// Kaltstart benötigte App-Shell (HTML, JS-/CSS-Bundle, Icons) tatsächlich
// vollständig im Cache liegt - der Button bestätigte "WLAN/Hotspot kann
// jetzt ausgeschaltet werden" zu früh.
//
// Fix: prepareOfflineShell() läuft als Teil des bewussten Vorbereiten-
// Klicks, registriert/aktiviert den Service Worker, LEERT dessen
// App-Shell-Cache vollständig (verhindert eine Versionsmischung aus
// älterem und neuerem Build im selben Cache) und füllt ihn danach aus den
// tatsächlich von der aktuell laufenden Seite geladenen Ressourcen neu -
// kein Build-Schritt, keine PWA-Bibliothek, kein hartcodiertes
// Datei-Manifest nötig (Vite hasht Dateinamen pro Build).
//
// CACHE_NAME muss mit public/sw.js übereinstimmen (dort ebenfalls
// dokumentiert und per Test abgesichert) - der Service Worker selbst kann
// dies nicht importieren, da er als eigenständiges, klassisches Skript
// läuft (bewusst kein Modul-Service-Worker, geringeres
// Kompatibilitätsrisiko).
export const CACHE_NAME = "monta-shell-v2";

/**
 * EIN gemeinsamer Erfolg (GPT-Review-Korrektur, Test A/B/C): "Offline-
 * Modus vorbereiten" gilt nur dann als abgeschlossen, wenn sowohl der
 * Projekt-Snapshot (IndexedDB) als auch die App-Shell erfolgreich
 * vorbereitet wurden. Reine Funktion, damit die Entscheidung selbst ohne
 * Browser-APIs testbar ist - siehe OfflinePrepareButton.jsx für die
 * tatsächliche Verwendung.
 */
export function isOfflinePrepareSuccessful({ snapshotOk, shellOk }) {
  return Boolean(snapshotOk && shellOk);
}

export function registerAppShellServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("MONTA: App-Shell-Service-Worker nicht registriert.", err?.message || err);
    });
  });
}

/** Reine Prüfung: gehört diese URL zur selben Origin wie die App (nie fremde Origins wie Supabase cachen). */
export function isSameOriginUrl(url, origin) {
  if (typeof url !== "string" || !url) return false;
  try {
    const u = new URL(url, origin);
    return u.origin === origin;
  } catch {
    return false;
  }
}

/**
 * Sammelt die Same-Origin-Ressourcen, die die aktuell laufende Seite
 * TATSÄCHLICH geladen hat (Script-/Stylesheet-/Icon-Tags im DOM plus
 * Resource-Timing-API für alles Weitere, z. B. dynamische Chunks) -
 * dadurch immer exakt die Dateien des aktuell aktiven Builds, ohne deren
 * (von Vite gehashte) Namen im Voraus zu kennen.
 */
function collectShellUrls() {
  if (typeof document === "undefined") return [];
  const origin = window.location.origin;
  const urls = new Set(["/", "/index.html", "/manifest.webmanifest"]);

  const addIfSameOrigin = (raw) => {
    if (!raw) return;
    if (!isSameOriginUrl(raw, origin)) return;
    const u = new URL(raw, origin);
    urls.add(u.pathname + u.search);
  };

  document.querySelectorAll("script[src]").forEach((el) => addIfSameOrigin(el.src));
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach((el) => addIfSameOrigin(el.href));
  document.querySelectorAll('link[rel~="icon"][href]').forEach((el) => addIfSameOrigin(el.href));
  document.querySelectorAll('link[rel="apple-touch-icon"][href]').forEach((el) => addIfSameOrigin(el.href));

  if (typeof performance !== "undefined" && performance.getEntriesByType) {
    performance.getEntriesByType("resource").forEach((entry) => addIfSameOrigin(entry.name));
  }

  return Array.from(urls);
}

/**
 * Stellt sicher, dass die vollständige App-Shell offline startfähig ist:
 * Service Worker registriert/aktiv, App-Shell-Cache geleert und aus den
 * tatsächlich geladenen Ressourcen frisch befüllt. Wirft einen Fehler,
 * wenn irgendein Teil fehlschlägt oder die Grundvoraussetzungen (Service
 * Worker/Cache Storage) im Browser fehlen - der Aufrufer (siehe
 * OfflinePrepareButton.jsx) entscheidet dann bewusst, den Erfolg NICHT zu
 * bestätigen.
 */
export async function prepareOfflineShell() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Dieser Browser unterstützt keinen Service Worker - Offline-Start ist nicht möglich.");
  }
  if (typeof caches === "undefined") {
    throw new Error("Dieser Browser unterstützt keinen Cache Storage - Offline-Start ist nicht möglich.");
  }

  await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  await caches.delete(CACHE_NAME);
  const cache = await caches.open(CACHE_NAME);

  const urls = collectShellUrls();
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url, { cache: "reload" });
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      await cache.put(url, response.clone());
    })
  );

  const failed = results
    .map((r, i) => (r.status === "rejected" ? urls[i] : null))
    .filter(Boolean);

  if (failed.length > 0) {
    throw new Error(
      `App-Shell konnte nicht vollständig zwischengespeichert werden (${failed.length} von ${urls.length} Ressourcen fehlgeschlagen: ${failed.join(", ")}).`
    );
  }
}
