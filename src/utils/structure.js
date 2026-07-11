// Fachliche Struktur: Projekt -> Baugruppe -> Bauteil -> Materialposition.
//
// WICHTIG: Es gibt (noch) keine eigenen Datenbanktabellen für Baugruppe/Bauteil.
// Um ohne Datenbankmigration auszukommen, wird die Zuordnung weiterhin über das
// bestehende Feld `einbauort` der material_items abgebildet, im Format
// "Baugruppe / Bauteil". Fehlt die Baugruppe (alte Daten ohne Trennzeichen),
// wird `project.baugruppe` als erste Baugruppe verwendet und der komplette
// bisherige Text als Bauteil übernommen ("Allgemein" falls leer).
//
// Zusätzlich können über die Projektseite leere Baugruppen/Bauteile angelegt
// werden, bevor eine erste Materialposition existiert. Diese "Registry" wird
// clientseitig in localStorage gehalten (reines UI-Gerüst, keine DB-Änderung).

export const DEFAULT_BAUGRUPPE = "Allgemein";
export const DEFAULT_BAUTEIL = "Allgemein";
const SEPARATOR = " / ";
const REGISTRY_KEY = "monta_structure_v04";

export function parseEinbauort(einbauort, projectBaugruppe) {
  const raw = String(einbauort || "").trim();
  const sepIdx = raw.indexOf(SEPARATOR);
  if (sepIdx >= 0) {
    const baugruppe = raw.slice(0, sepIdx).trim() || projectBaugruppe || DEFAULT_BAUGRUPPE;
    const bauteil = raw.slice(sepIdx + SEPARATOR.length).trim() || DEFAULT_BAUTEIL;
    return { baugruppe, bauteil };
  }
  return {
    baugruppe: projectBaugruppe || DEFAULT_BAUGRUPPE,
    bauteil: raw || DEFAULT_BAUTEIL,
  };
}

export function formatEinbauort(baugruppe, bauteil) {
  const bg = String(baugruppe || DEFAULT_BAUGRUPPE).trim() || DEFAULT_BAUGRUPPE;
  const bt = String(bauteil || DEFAULT_BAUTEIL).trim() || DEFAULT_BAUTEIL;
  return `${bg}${SEPARATOR}${bt}`;
}

function readRegistry() {
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeRegistry(data) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(data));
  } catch {
    // localStorage evtl. nicht verfügbar – Registry ist nur ein UI-Komfort, kein Datenverlust
  }
}

export function addBaugruppeToRegistry(projectId, baugruppe) {
  const name = String(baugruppe || "").trim();
  if (!name) return;
  const all = readRegistry();
  const cur = all[projectId] || { baugruppen: [], bauteile: {} };
  if (!cur.baugruppen.includes(name)) cur.baugruppen = [...cur.baugruppen, name];
  all[projectId] = cur;
  writeRegistry(all);
}

export function addBauteilToRegistry(projectId, baugruppe, bauteil) {
  const bg = String(baugruppe || "").trim() || DEFAULT_BAUGRUPPE;
  const bt = String(bauteil || "").trim();
  if (!bt) return;
  const all = readRegistry();
  const cur = all[projectId] || { baugruppen: [], bauteile: {} };
  if (!cur.baugruppen.includes(bg)) cur.baugruppen = [...cur.baugruppen, bg];
  const list = cur.bauteile[bg] || [];
  if (!list.includes(bt)) cur.bauteile[bg] = [...list, bt];
  all[projectId] = cur;
  writeRegistry(all);
}

// Baut die Baugruppen/Bauteil-Übersicht aus vorhandenen Materialpositionen
// plus eventuell leer angelegten Baugruppen/Bauteilen aus der Registry.
export function buildProjectStructure(project, items) {
  const registry = readRegistry()[project?.id] || { baugruppen: [], bauteile: {} };
  const map = new Map();

  registry.baugruppen.forEach((bg) => {
    map.set(bg, new Set(registry.bauteile[bg] || []));
  });

  items.forEach((item) => {
    const { baugruppe, bauteil } = parseEinbauort(item.einbauort, project?.baugruppe);
    if (!map.has(baugruppe)) map.set(baugruppe, new Set());
    map.get(baugruppe).add(bauteil);
  });

  if (map.size === 0) {
    map.set(project?.baugruppe || DEFAULT_BAUGRUPPE, new Set());
  }

  return Array.from(map.entries()).map(([baugruppe, bauteile]) => ({
    baugruppe,
    bauteile: Array.from(bauteile),
  }));
}
