import { groupBy } from "../../utils/helpers";
import { naturalCompare } from "../../utils/sorting";
import { uniqueSortedPositions } from "./technikerUtils";

// Nachvollziehbare Herkunftsangabe für eine Gruppe zusammengefasster
// Materialpositionen (Sprint 7 Abschluss, Punkt 2): je Bauteil eine Zeile
// mit Baugruppe, Bauteil und den ursprünglichen TB-Positionsnummern
// (numerisch sortiert, ohne Duplikate, keine technischen IDs). Wird sowohl
// im Lager als auch im Warenkorb verwendet, damit jede Lager-/Warenkorb-
// Position bis zur TB-Erfassung eindeutig nachvollziehbar bleibt.
export function buildHerkunft(baugruppe, items) {
  const byBauteil = groupBy(items, (i) => i.bauteil);
  return Object.keys(byBauteil)
    .sort((a, b) => naturalCompare(a, b))
    .map((bauteil) => ({
      baugruppe,
      bauteil,
      positions: uniqueSortedPositions(byBauteil[bauteil]),
    }));
}

// Einzeiliger Text derselben Angabe (z. B. für interne Anzeigen).
export function formatHerkunftText(herkunft) {
  return herkunft
    .map((h) => `${h.baugruppe} · ${h.bauteil}${h.positions.length ? ` (Pos. ${h.positions.join(", ")})` : ""}`)
    .join("; ");
}
