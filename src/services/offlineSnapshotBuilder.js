// Aufbau des Offline-Projekt-Snapshots (Sprint: Lager-Offline-Praxis).
//
// Bewusst EIN Snapshot pro Gerät (siehe offlineSnapshot.js, fester
// Speicherschlüssel): einfacher, sicherer erster Schritt ohne
// Snapshot-Auswahl-UI. "Offline-Modus vorbereiten" ersetzt kontrolliert
// den bisherigen Snapshot dieses Geräts (Entscheidung dokumentiert im
// Sprintbericht).
//
// Reine Funktionen (keine IndexedDB-/DOM-Abhängigkeit), damit die
// Snapshot-Struktur ohne Browser testbar ist.

export const SNAPSHOT_SCHEMA_VERSION = 1;

/**
 * Projektdaten unverändert in derselben Form wie die Live-Daten
 * übernehmen (keine Transformation) - dadurch funktionieren bestehende
 * reine Anzeige-/Such-/Sortier-/Gruppierungsfunktionen (z. B. PrintView,
 * filterBySearch, buildProjectStructure) unverändert auch auf dem
 * Offline-Snapshot, ohne eine zweite Darstellungslogik zu benötigen.
 */
export function buildSnapshot({ project, items, structureRows }) {
  if (!project?.id) throw new Error("Snapshot benötigt ein geladenes Projekt.");
  const projectItems = (items || []).filter((i) => String(i.project_id) === String(project.id));
  const projectStructureRows = (structureRows || []).filter(
    (r) => String(r.project_id) === String(project.id)
  );
  return {
    id: "current",
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    preparedAt: new Date().toISOString(),
    projectId: project.id,
    projectNr: project.nr || "",
    projectShortLabel: project.name || "",
    projectBaugruppe: project.baugruppe || "",
    projectZeichnung: project.zeichnung || "",
    items: projectItems,
    structureRows: projectStructureRows,
  };
}

const FORBIDDEN_KEY_PATTERN = /token|secret|password|passwort|service_role|apikey|api_key/i;

/**
 * Grobe, aber wirksame Absicherung (Sprint 21 "Keine Auth-Tokens/Secrets"):
 * ein Snapshot darf keine derart benannten Felder enthalten. Prüft
 * rekursiv die tatsächlich gespeicherten Schlüssel, nicht nur die
 * Top-Ebene.
 */
export function containsForbiddenKeys(value, seen = new Set()) {
  if (value === null || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((v) => containsForbiddenKeys(v, seen));
  }
  return Object.entries(value).some(
    ([key, v]) => FORBIDDEN_KEY_PATTERN.test(key) || containsForbiddenKeys(v, seen)
  );
}

/** Minimale strukturelle Prüfung eines geladenen Snapshots vor Verwendung. */
export function isValidSnapshot(snapshot) {
  return Boolean(
    snapshot &&
      typeof snapshot === "object" &&
      snapshot.projectId &&
      typeof snapshot.preparedAt === "string" &&
      Number.isFinite(snapshot.schemaVersion) &&
      Array.isArray(snapshot.items) &&
      Array.isArray(snapshot.structureRows)
  );
}
