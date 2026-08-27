import { parseEinbauort, formatEinbauort } from "../../utils/structure.js";
import { uniqueSortedPositions } from "./technikerUtils.js";
import {
  dedupeHinweisText,
  displayHinweisWithoutAutoMark,
  normalizeHinweisForCompare,
  sizeCompareValue,
} from "./fasteningRules.js";

/**
 * Druckaggregation: gleiche Verbindungsmittel innerhalb desselben Bauteils
 * zu einer Zeile zusammenfassen (siehe PrintView.jsx). Reine Logik in
 * einer eigenen .js-Datei (statt JSX), damit sie ohne React-Renderer
 * testbar ist (wie die übrigen reinen Logikmodule dieses Projekts).
 *
 * Der reine Systemhinweis "Automatisch ergänzt" (siehe TechnikerEditor.jsx)
 * wird über die bestehende zentrale Bereinigung
 * (displayHinweisWithoutAutoMark, auch von Lager/Warenkorb genutzt) aus der
 * Druckanzeige entfernt; ein zusammengesetzter fachlicher Hinweis behält
 * seinen restlichen Anteil. Die gespeicherten Positionen bleiben
 * unverändert - nur die Druckanzeige wird bereinigt.
 */
export function aggregateForPrint(items, project) {
  const groups = new Map();
  items.forEach((item) => {
    const { baugruppe, bauteil } = parseEinbauort(item.einbauort, project?.baugruppe);
    // Größenvergleich metrisch-bewusst (siehe sizeCompareValue) - gleiche
    // Sechskantschraube M12/"12" wird auf der Montageunterlage zusammengefasst.
    const key = [
      bauteil,
      item.bezeichnung,
      sizeCompareValue(item.bezeichnung, item.groesse),
      item.laenge,
      item.oberflaeche,
    ].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        id: item.id,
        einbauort: formatEinbauort(baugruppe, bauteil),
        baugruppe,
        bauteil,
        bezeichnung: item.bezeichnung,
        groesse: item.groesse,
        laenge: item.laenge,
        oberflaeche: item.oberflaeche,
        menge: 0,
        important_note: false,
        _items: [],
        _hinweise: [],
      });
    }
    const g = groups.get(key);
    g.menge += Number(item.menge || 0);
    g._items.push(item);
    if (item.important_note) g.important_note = true;
    const cleanedHinweis = displayHinweisWithoutAutoMark(item.hinweis);
    if (cleanedHinweis) {
      for (const part of cleanedHinweis.split(/\n|(?:\s*[·•|]\s*)/)) {
        const t = part.trim();
        if (
          t &&
          !g._hinweise.some(
            (h) => normalizeHinweisForCompare(h) === normalizeHinweisForCompare(t)
          )
        ) {
          g._hinweise.push(t);
        }
      }
    }
  });
  return Array.from(groups.values()).map((g) => ({
    ...g,
    pos: uniqueSortedPositions(g._items).join(", "),
    hinweis: dedupeHinweisText(g._hinweise.join(" · ")),
  }));
}
