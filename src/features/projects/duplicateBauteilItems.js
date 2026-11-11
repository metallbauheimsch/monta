import { formatEinbauort } from "../../utils/structure.js";

/**
 * Materialpositionen eines Bauteils für die Duplikat-Anlage aufbereiten.
 * Neue UUIDs, neuer Einbauort, Lager/Bestell zurückgesetzt.
 * ersetzt_durch wird auf die neuen IDs derselben Kopie umgebogen.
 * Die übergebenen Originalobjekte werden nicht mutiert.
 */
export function buildDuplicatedBauteilItems(srcItems, { projectId, baugruppe, newBauteilName, createId }) {
  const originals = Array.isArray(srcItems) ? srcItems : [];
  const idMap = new Map();
  for (const item of originals) {
    idMap.set(item.id, createId());
  }

  return originals.map((item) => {
    const remappedErsatz =
      item.ersetzt_durch && idMap.has(item.ersetzt_durch) ? idMap.get(item.ersetzt_durch) : null;
    return {
      id: idMap.get(item.id),
      project_id: String(projectId),
      pos: item.pos,
      einbauort: formatEinbauort(baugruppe, newBauteilName),
      menge: Number(item.menge || 0),
      bezeichnung: item.bezeichnung,
      groesse: item.groesse,
      laenge: item.laenge,
      oberflaeche: item.oberflaeche,
      hinweis: item.hinweis,
      important_note: Boolean(item.important_note),
      bereit: 0,
      bestellt: false,
      geliefert: false,
      ersetzt_durch: remappedErsatz,
    };
  });
}

/** Insert ohne FK, danach Updates – vermeidet Verletzung von ersetzt_durch. */
export function splitDuplicatedItemsForInsert(items) {
  const rows = Array.isArray(items) ? items : [];
  const insertRows = rows.map((item) => {
    const rest = { ...item };
    delete rest.ersetzt_durch;
    return rest;
  });
  const fkUpdates = rows
    .filter((item) => item.ersetzt_durch)
    .map((item) => ({ id: item.id, ersetzt_durch: item.ersetzt_durch }));
  return { insertRows, fkUpdates };
}
