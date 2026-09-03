// Warenkorb-Zeilenberechnung (aus EinkaufView.jsx extrahiert, Praxis-
// Sprint: Mehrprojekt-Anfrage) - reine Funktion, damit dieselbe Regel für
// die Bildschirmtabelle (ein Projekt) UND die Lieferantenanfrage (ein oder
// mehrere Projekte) verwendet wird. Keine zweite, abweichende Fehlmengen-
// /Bestellregel.
import { groupBy } from "../../utils/helpers.js";
import { parseEinbauort } from "../../utils/structure.js";
import { buildHerkunftProject } from "./herkunft.js";
import { articleIdentityKey } from "./fasteningRules.js";
import { isActiveItem } from "./replacement.js";

/**
 * Projektweite Warenkorb-Zeilen (identisch zur bisherigen EinkaufView-
 * Logik): ersetzte Altpositionen zählen nicht mehr als Bedarf
 * (isActiveItem), gleiche Artikel werden über articleIdentityKey
 * zusammengefasst (u. a. M12/"12"-Normalisierung), nur Zeilen mit
 * Fehlmenge oder vollständig gelieferte Zeilen werden angezeigt.
 */
export function buildWarenkorbRows(items, project) {
  const enriched = (items || []).map((i) => ({
    ...i,
    ...parseEinbauort(i.einbauort, project?.baugruppe),
  }));
  const combos = groupBy(enriched.filter(isActiveItem), articleIdentityKey);
  return Object.values(combos)
    .map((arr) => {
      const first = arr[0];
      const menge = arr.reduce((s, i) => s + Number(i.menge || 0), 0);
      const geliefert = arr.reduce((s, i) => s + Number(i.bereit || 0), 0);
      const fehlmenge = Math.max(0, menge - geliefert);
      const vollstaendig = menge > 0 && fehlmenge === 0;
      const herkunft = buildHerkunftProject(arr);
      return {
        key: `${project.id}|${articleIdentityKey(first)}`,
        bezeichnung: first.bezeichnung,
        groesse: first.groesse,
        laenge: first.laenge,
        oberflaeche: first.oberflaeche,
        menge,
        geliefert,
        fehlmenge,
        vollstaendig,
        herkunft,
        bestellt: arr.every((i) => i.bestellt),
        important_note: arr.some((i) => i.important_note),
        items: arr,
      };
    })
    .filter((r) => r.fehlmenge > 0 || r.vollstaendig);
}

/**
 * Bestellrelevante Zeilen für die Lieferantenanfrage EINES Projekts: offene
 * Fehlmenge, noch nicht bestellt, nicht vollständig geliefert - dieselbe
 * Regel wie bisher in EinkaufView.buildMailRows, jetzt auch für die
 * Mehrprojekt-Anfrage wiederverwendet.
 */
export function buildMailRowsForProject(items, project) {
  return buildWarenkorbRows(items, project).filter(
    (r) => r.fehlmenge > 0 && !r.bestellt && !r.vollstaendig
  );
}

/**
 * Projektübergreifende Zusammenführung identischer Artikel (Praxis-Sprint:
 * Mehrprojekt-Warenkorb-Anfrage). Nimmt bereits berechnete Mail-Zeilen
 * mehrerer Projekte (buildMailRowsForProject je Projekt) entgegen und fasst
 * sie über dieselbe zentrale Artikelidentität (articleIdentityKey) erneut
 * zusammen - keine abweichende Vergleichslogik, keine Projektinformation
 * mehr je Zeile (die Summierung ist bewusst projektübergreifend).
 */
export function aggregateMailRowsAcrossProjects(rowsPerProject) {
  const all = (rowsPerProject || []).flat();
  const groups = groupBy(all, (r) => articleIdentityKey(r));
  return Object.values(groups).map((arr) => ({
    bezeichnung: arr[0].bezeichnung,
    groesse: arr[0].groesse,
    laenge: arr[0].laenge,
    oberflaeche: arr[0].oberflaeche,
    menge: arr.reduce((s, r) => s + Number(r.menge || 0), 0),
  }));
}
