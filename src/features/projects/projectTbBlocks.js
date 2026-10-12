import { buildProjectStructure, parseEinbauort } from "../../utils/structure.js";
import { baugruppeStatus, groupBy } from "../../utils/helpers.js";
import { sortByPosNumber } from "../fastening/technikerUtils.js";
import { isActiveItem } from "../fastening/replacement.js";

/**
 * Projektweite TB-Übersicht (Sprint 2A): alle aktiven TB-Positionen des
 * Projekts, gegliedert nach Baugruppe → Bauteil in derselben Reihenfolge
 * wie die Projektübersicht (buildProjectStructure). Reine Logik in einer
 * eigenen .js-Datei (wie printAggregation.js), damit sie ohne React-Renderer
 * testbar ist.
 *
 * Bewusst KEINE Zusammenfassung gleicher Artikel (anders als die
 * Druckansicht): jede Position bleibt einzeln mit ihrer Pos.-Nr. sichtbar.
 * Ersetzte Altpositionen werden ausgeblendet (isActiveItem). Bauteile ohne
 * aktive Position bleiben als (leerer) Block erhalten, damit jedes Bauteil
 * aus der Übersicht heraus zur Bearbeitung geöffnet werden kann.
 */
export function buildProjectTbBlocks(project, projectItems, structureRows = []) {
  const active = (projectItems || []).filter(isActiveItem);
  const structure = buildProjectStructure(project, active, structureRows || []);
  const byBaugruppe = groupBy(
    active.map((i) => ({ ...i, ...parseEinbauort(i.einbauort, project?.baugruppe) })),
    (i) => i.baugruppe || ""
  );

  return structure.map(({ baugruppe, bauteile }) => {
    const bgItems = byBaugruppe[baugruppe] || [];
    const byBauteil = groupBy(bgItems, (i) => i.bauteil);
    return {
      baugruppe,
      // Gleiche Ampel wie Druck/Projektübersicht.
      status: baugruppeStatus(bgItems),
      bauteile: bauteile.map((bauteil) => ({
        bauteil,
        items: sortByPosNumber(byBauteil[bauteil] || []),
      })),
    };
  });
}
