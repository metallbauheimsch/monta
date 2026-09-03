// Deep-Link aus internen Workflow-Mails (Praxis-Sprint): ?project=<id>&tab=<reiter>
// öffnet nach dem Login direkt das passende Projekt/den passenden Reiter.
// Reine Parsing-Logik, damit App.jsx nur noch das Ergebnis anwenden muss.
// Fehlende/ungültige Parameter führen sicher zur normalen App (kein Fehler,
// kein Absturz) - kein Ersatz für Auth, die Auswertung läuft erst NACH den
// bestehenden Login-Gates.
import { PROJECT_WIDE_TAB_ORDER } from "./tabs.js";

/**
 * Liest ?project=&tab= aus einem Such-String (z. B. window.location.search).
 * Liefert { projectId, tab } oder null, wenn Parameter fehlen oder der
 * Reiter fachlich ungültig ist (nur projektweite Reiter sind als Ziel
 * sinnvoll - TB benötigt zusätzlich Baugruppe/Bauteil und ist deshalb kein
 * gültiges Deep-Link-Ziel).
 */
export function parseDeepLinkParams(search) {
  const params = new URLSearchParams(search || "");
  const projectId = params.get("project");
  const tab = params.get("tab");
  if (!projectId || !tab) return null;
  if (!PROJECT_WIDE_TAB_ORDER.includes(tab)) return null;
  return { projectId, tab };
}

/** Entfernt project/tab aus der Adresszeile, ohne die Seite neu zu laden. */
export function stripDeepLinkParams() {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.delete("project");
  url.searchParams.delete("tab");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}
