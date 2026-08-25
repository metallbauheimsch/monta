// Registrierung des minimalen App-Shell-Service-Workers (Sprint: Lager-
// Offline-Praxis, siehe public/sw.js). Rein additiv und best-effort: ein
// Fehler hier darf den normalen Online-Start niemals verhindern oder
// verzögern (siehe App.jsx - wird beim Start fire-and-forget aufgerufen,
// nichts wartet auf das Ergebnis).
export function registerAppShellServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("MONTA: App-Shell-Service-Worker nicht registriert.", err?.message || err);
    });
  });
}
