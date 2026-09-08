// Projektübergreifende Lager-Suche (Praxis-Sprint): auf der Baustelle
// angeliefertes Material soll auch dann einem laufenden Projekt zugeordnet
// werden können, wenn unklar ist, für welches Projekt es bestimmt war.
//
// Wiederverwendet bewusst dieselbe zentrale Fehlmengen-/Aggregationslogik
// wie Lager und Warenkorb (buildWarenkorbRows aus warenkorbRows.js):
// Fehlmenge = Menge - Geliefert, ersetzte Altpositionen (ersetzt_durch)
// zählen nicht mehr als Bedarf (isActiveItem). "Offen" bedeutet hier exakt
// dasselbe wie die Lager-Restmenge/Warenkorb-Fehlmenge - keine zweite,
// abweichende Definition. Archivierte Projekte werden ausgeschlossen
// (project.archived, dieselbe bestehende Archivierungsdefinition wie in
// EinkaufView.jsx/App.jsx, nicht neu erfunden).
import { buildWarenkorbRows } from "./warenkorbRows.js";
import { filterBySearch, sizeLengthSearchParts } from "../../utils/textSearch.js";
import { herkunftSearchParts } from "./herkunft.js";
import { collectUniqueHinweise } from "./fasteningRules.js";

/**
 * @returns {{project: object, row: object}[]} Treffer, je Zeile eindeutig
 *   einem Projekt zugeordnet.
 */
export function buildGlobalSearchResults(query, { projects, items }) {
  const q = String(query || "").trim();
  if (!q) return [];

  const activeProjects = (projects || []).filter((p) => !p.archived);
  const results = [];

  for (const project of activeProjects) {
    const projectItems = (items || []).filter((i) => i.project_id === project.id);
    const openRows = buildWarenkorbRows(projectItems, project).filter((r) => r.fehlmenge > 0);
    const matched = filterBySearch(openRows, q, (row) => [
      project.nr,
      project.name,
      row.bezeichnung,
      row.groesse,
      row.laenge,
      row.oberflaeche,
      ...herkunftSearchParts(row.herkunft, row.items).filter(
        (p) => String(p || "").toLowerCase() !== "automatisch ergänzt"
      ),
      ...collectUniqueHinweise(row.items).map((h) => h.text),
      ...sizeLengthSearchParts(row.groesse, row.laenge),
    ]);
    for (const row of matched) results.push({ project, row });
  }

  return results;
}
