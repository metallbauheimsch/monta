// Fachliche Struktur: Projekt -> Baugruppe -> Bauteil -> Materialposition.
//
// Pilot Sprint: Baugruppen/Bauteile liegen in Supabase (Tabelle
// project_structure). Das Feld einbauort bei material_items bleibt
// "Baugruppe / Bauteil" und wird weiter für Materialzuordnung genutzt.
//
// Ohne Supabase: lokale Registry/localStorage als Fallback (Einzelgerät).

export const DEFAULT_BAUGRUPPE = "Allgemein";
export const DEFAULT_BAUTEIL = "Allgemein";
const SEPARATOR = " / ";
const REGISTRY_KEY = "monta_structure_v04";
const LOCAL_STRUCTURE_KEY = "monta_project_structure_v04";
const MIGRATION_FLAG_KEY = "monta_structure_migrated_v1";

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

export function structureRowKey(projectId, baugruppe, bauteil) {
  const bg = String(baugruppe || "").trim();
  const bt = bauteil == null || String(bauteil).trim() === "" ? "" : String(bauteil).trim();
  // project_id als String normalisieren (UUID-Vergleich PC/Mobil).
  return `${String(projectId || "")}|${bg}|${bt}`;
}

export function isBaugruppeRow(row) {
  return row && (row.bauteil == null || String(row.bauteil).trim() === "");
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
    // localStorage evtl. nicht verfügbar
  }
}

export function readLocalStructureRows() {
  try {
    const raw = localStorage.getItem(LOCAL_STRUCTURE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalStructureRows(rows) {
  try {
    localStorage.setItem(LOCAL_STRUCTURE_KEY, JSON.stringify(rows || []));
  } catch {
    // ignore
  }
}

export function wasStructureMigrated() {
  try {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function markStructureMigrated() {
  try {
    localStorage.setItem(MIGRATION_FLAG_KEY, "1");
  } catch {
    // ignore
  }
}

// Sammelt alle bekannten Baugruppen/Bauteile aus lokaler Registry und
// vorhandenen Materialpositionen – für einmalige Migration nach Supabase.
export function collectStructureCandidates(projects, items) {
  const map = new Map();
  const projectsById = new Map((projects || []).map((p) => [p.id, p]));
  const registry = readRegistry();

  Object.entries(registry).forEach(([projectId, cur]) => {
    (cur.baugruppen || []).forEach((bg) => {
      const name = String(bg || "").trim();
      if (!name) return;
      map.set(structureRowKey(projectId, name, null), {
        project_id: projectId,
        baugruppe: name,
        bauteil: null,
      });
      (cur.bauteile?.[name] || []).forEach((bt) => {
        const bauteil = String(bt || "").trim();
        if (!bauteil) return;
        map.set(structureRowKey(projectId, name, bauteil), {
          project_id: projectId,
          baugruppe: name,
          bauteil,
        });
      });
    });
  });

  (items || []).forEach((item) => {
    const project = projectsById.get(item.project_id);
    const { baugruppe, bauteil } = parseEinbauort(item.einbauort, project?.baugruppe);
    if (!baugruppe) return;
    map.set(structureRowKey(item.project_id, baugruppe, null), {
      project_id: item.project_id,
      baugruppe,
      bauteil: null,
    });
    if (bauteil) {
      map.set(structureRowKey(item.project_id, baugruppe, bauteil), {
        project_id: item.project_id,
        baugruppe,
        bauteil,
      });
    }
  });

  return Array.from(map.values());
}

export function hasStructureRow(rows, projectId, baugruppe, bauteil) {
  const key = structureRowKey(projectId, baugruppe, bauteil);
  return (rows || []).some(
    (r) => structureRowKey(r.project_id, r.baugruppe, r.bauteil) === key
  );
}

export function findBauteilRow(rows, projectId, baugruppe, bauteil) {
  const key = structureRowKey(projectId, baugruppe, bauteil);
  return (rows || []).find(
    (r) => structureRowKey(r.project_id, r.baugruppe, r.bauteil) === key && !isBaugruppeRow(r)
  ) || null;
}

export function getBauteilgruppe(rows, projectId, baugruppe, bauteil) {
  // Bauteilgruppen-UI entfernt: Spalte bleibt in der DB erhalten, wird ignoriert.
  void rows;
  void projectId;
  void baugruppe;
  void bauteil;
  return null;
}

const UNGROUPED_LABEL = "Nicht gruppiert";

/** Flache Bauteilliste einer Baugruppe (Anlage-Reihenfolge), ohne Gruppen-UI. */
export function buildBaugruppeSections(projectId, baugruppe, bauteile, structureRows = []) {
  const pid = String(projectId || "");
  const bg = String(baugruppe || "").trim();
  const meta = new Map();

  (structureRows || [])
    .filter((r) => String(r.project_id || "") === pid && String(r.baugruppe || "").trim() === bg)
    .filter((r) => !isBaugruppeRow(r))
    .forEach((r) => {
      const bt = String(r.bauteil || "").trim();
      if (!bt) return;
      meta.set(bt, { createdAt: r.created_at || "" });
    });

  (bauteile || []).forEach((bt) => {
    if (!meta.has(bt)) meta.set(bt, { createdAt: "" });
  });

  const list = Array.from(meta.entries())
    .sort((a, b) => {
      const ca = Date.parse(a[1].createdAt) || 0;
      const cb = Date.parse(b[1].createdAt) || 0;
      return ca - cb || a[0].localeCompare(b[0], undefined, { numeric: true });
    })
    .map(([bt]) => bt);

  return [{ bauteilgruppe: null, bauteile: list, ungrouped: true }];
}

export { UNGROUPED_LABEL };

// Baut die Übersicht aus project_structure (+ Materialpositionen als
// Sicherheitsnetz). Bauteilgruppe-Werte in der DB werden ignoriert.
export function buildProjectStructure(project, items, structureRows = []) {
  const map = new Map();
  const pid = String(project?.id || "");

  (structureRows || [])
    .filter((r) => String(r.project_id || "") === pid)
    .forEach((row) => {
      const bg = String(row.baugruppe || "").trim();
      if (!bg) return;
      if (!map.has(bg)) map.set(bg, new Set());
      if (!isBaugruppeRow(row)) {
        map.get(bg).add(String(row.bauteil).trim());
      }
    });

  (items || []).forEach((item) => {
    const { baugruppe, bauteil } = parseEinbauort(item.einbauort, project?.baugruppe);
    if (!map.has(baugruppe)) map.set(baugruppe, new Set());
    map.get(baugruppe).add(bauteil);
  });

  return Array.from(map.entries()).map(([baugruppe, bauteileSet]) => {
    const bauteile = Array.from(bauteileSet);
    return {
      baugruppe,
      bauteile,
      sections: buildBaugruppeSections(pid, baugruppe, bauteile, structureRows),
    };
  });
}

// --- Lokaler Fallback (kein Supabase) ---------------------------------

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

export function removeBaugruppeFromRegistry(projectId, baugruppe) {
  const all = readRegistry();
  const cur = all[projectId];
  if (!cur) return;
  cur.baugruppen = (cur.baugruppen || []).filter((bg) => bg !== baugruppe);
  if (cur.bauteile) {
    const { [baugruppe]: _removed, ...restBauteile } = cur.bauteile;
    cur.bauteile = restBauteile;
  }
  all[projectId] = cur;
  writeRegistry(all);
}

export function removeBauteilFromRegistry(projectId, baugruppe, bauteil) {
  const all = readRegistry();
  const cur = all[projectId];
  if (!cur?.bauteile?.[baugruppe]) return;
  cur.bauteile[baugruppe] = (cur.bauteile[baugruppe] || []).filter((bt) => bt !== bauteil);
  all[projectId] = cur;
  writeRegistry(all);
}

export function renameBaugruppeInRegistry(projectId, oldName, newName) {
  const all = readRegistry();
  const cur = all[projectId];
  if (!cur) return;
  cur.baugruppen = (cur.baugruppen || []).map((bg) => (bg === oldName ? newName : bg));
  if (cur.bauteile && oldName in cur.bauteile) {
    const { [oldName]: bauteile, ...restBauteile } = cur.bauteile;
    restBauteile[newName] = bauteile;
    cur.bauteile = restBauteile;
  }
  all[projectId] = cur;
  writeRegistry(all);
}

export function renameBauteilInRegistry(projectId, baugruppe, oldName, newName) {
  const all = readRegistry();
  const cur = all[projectId];
  if (!cur || !cur.bauteile) return;
  const list = cur.bauteile[baugruppe] || [];
  cur.bauteile[baugruppe] = list.map((bt) => (bt === oldName ? newName : bt));
  all[projectId] = cur;
  writeRegistry(all);
}
