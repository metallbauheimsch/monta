// Sortierung der Projektübersicht (Sprint 1). Reine Funktionen, damit die
// Reihenfolge ohne Browser testbar ist. Sortiert wird ausschließlich lokal
// in der Anzeige - die geladenen Projektdaten bleiben unverändert.
import { projectStatus } from "../../utils/helpers.js";

export const ACTIVE_SORT_MODES = [
  { key: "status", label: "Nach Status" },
  { key: "created", label: "Nach Erstellungsdatum" },
  { key: "name", label: "Alphabetisch A–Z" },
];
export const DEFAULT_ACTIVE_SORT = "status";

// Rot (offen) → Gelb (bestellt) → Grün (bereit) → Grau (keine Positionen).
export const STATUS_SORT_ORDER = { offen: 0, bestellt: 1, bereit: 2, leer: 3 };

const collator = new Intl.Collator("de", { sensitivity: "base", numeric: true });

/** Projektname A–Z (deutsche Sortierung), bei Gleichstand Projektnummer, zuletzt ID - dadurch stabil. */
export function compareProjectName(a, b) {
  return (
    collator.compare(a.name || "", b.name || "") ||
    collator.compare(a.nr || "", b.nr || "") ||
    String(a.id).localeCompare(String(b.id))
  );
}

function createdTime(p) {
  const t = Date.parse(p.created_at);
  return Number.isNaN(t) ? null : t;
}

/** Aktive und archivierte Projekte getrennt (Reihenfolge der Eingabe bleibt erhalten). */
export function splitProjects(projects) {
  const active = [];
  const archived = [];
  (projects || []).forEach((p) => (p.archived ? archived : active).push(p));
  return { active, archived };
}

export function sortActiveProjects(projects, items, mode = DEFAULT_ACTIVE_SORT) {
  const list = [...(projects || [])];
  if (mode === "created") {
    // Neueste zuerst; Projekte ohne gültiges Datum ans Ende.
    return list.sort((a, b) => {
      const ta = createdTime(a);
      const tb = createdTime(b);
      if (ta !== tb) {
        if (ta === null) return 1;
        if (tb === null) return -1;
        return tb - ta;
      }
      return compareProjectName(a, b);
    });
  }
  if (mode === "name") return list.sort(compareProjectName);

  const rank = new Map(
    list.map((p) => [p.id, STATUS_SORT_ORDER[projectStatus(p, items || []).key]])
  );
  return list.sort((a, b) => rank.get(a.id) - rank.get(b.id) || compareProjectName(a, b));
}

/** Archiv: A–Z ("asc") oder Z–A ("desc") nach Projektname. */
export function sortArchivedProjects(projects, dir = "asc") {
  const list = [...(projects || [])].sort(compareProjectName);
  return dir === "desc" ? list.reverse() : list;
}

export function toggleSortDir(dir) {
  return dir === "desc" ? "asc" : "desc";
}

/** Archiv-Einblendung ist erreichbar, sobald überhaupt Projekte existieren - auch wenn alle archiviert sind. */
export function isArchiveToggleVisible(projects) {
  return (projects || []).length > 0;
}
