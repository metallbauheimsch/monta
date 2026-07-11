// Feste Paternoster-/Regal-Zuordnung (Sprint 6), fachlich vom Betrieb
// vorgegeben. Bewusst ohne Einstellungs-/Pflegeoberfläche - die Zuordnung
// ändert sich nicht über die Bedienung, sondern nur durch Anpassung dieser
// Datei, falls sich die tatsächliche Regalbelegung ändert.
//
// Bekannte Zuordnung (Stand Sprint 6):
// - Edelstahl (Ausführung, unabhängig vom Artikeltyp): Fach 4–7
// - Chemische Dübel (Hilti HIT, Verbundmörtel): Fach 2–3
// - Verzinkte Dübel (Bolzenanker/Rahmendübel/Kunststoffdübel/Betonschraube,
//   Ausführung feuerverzinkt oder galvanisch): Fach 25
// - Feuerverzinkte Schrauben: Fach 9
// - HV (Ausführung, unabhängig vom Artikeltyp): Fach 26
// - Galvanische Schrauben: Fach 1, 26, 27 (mehrere Fächer gleichzeitig -
//   anhand der vorhandenen Materialdaten lässt sich nicht auf eines der drei
//   Fächer eingrenzen, deshalb wird ehrlich der ganze Bereich angezeigt statt
//   ein einzelnes Fach zu erfinden)
//
// Alles, was sich anhand von Bezeichnung + Ausführung nicht eindeutig einer
// dieser Regeln zuordnen lässt (z. B. U-Scheibe, Sechskantmutter,
// Stoppmutter, Hutmutter, Karosseriescheibe, Ankerstange, Blindniete, oder
// unbekannte/freie Ausführungstexte), bekommt bewusst KEIN erfundenes Fach,
// sondern gilt als "Ohne Fachzuordnung" und landet beim Sortieren ans Ende.
// Offene Fälle: siehe Abschlussbericht Sprint 6.

const SCHRAUBEN = [
  "sechskantschraube",
  "senkschraube",
  "linsenkopfschraube",
  "zylinderkopfschraube",
  "bohrschraube",
  "holzschraube",
  "blechschraube",
];

const DUEBEL_MECHANISCH = ["bolzenanker", "rahmendübel", "kunststoffdübel", "betonschraube"];

const DUEBEL_CHEMISCH = ["hilti hit", "verbundmörtel"];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function isBezeichnungIn(list, bezeichnung) {
  return list.includes(normalize(bezeichnung));
}

// Ermittelt Fach + Sortier-Index für eine Position (Bezeichnung +
// Ausführung). Gibt null zurück, wenn keine der bekannten Regeln eindeutig
// zutrifft - dann gibt es bewusst kein erfundenes Fach.
function resolveFach(bezeichnung, oberflaeche) {
  const ausf = normalize(oberflaeche);
  const bez = normalize(bezeichnung);

  if (ausf === "hv") return { fach: "26", sortIndex: 4 };
  if (ausf === "edelstahl") return { fach: "4–7", sortIndex: 0 };
  if (isBezeichnungIn(DUEBEL_CHEMISCH, bez)) return { fach: "2–3", sortIndex: 1 };
  if (ausf === "feuerverzinkt" && isBezeichnungIn(SCHRAUBEN, bez)) return { fach: "9", sortIndex: 3 };
  if ((ausf === "feuerverzinkt" || ausf === "galvanisch") && isBezeichnungIn(DUEBEL_MECHANISCH, bez)) {
    return { fach: "25", sortIndex: 5 };
  }
  if (ausf === "galvanisch" && isBezeichnungIn(SCHRAUBEN, bez)) return { fach: "1, 26, 27", sortIndex: 2 };
  return null;
}

// Sortier-Reihenfolge im Paternoster (kleiner = weiter vorne). Positionen
// ohne eindeutige Zuordnung landen beim Sortieren immer am Ende.
export function regalOrderIndex(item) {
  const resolved = resolveFach(item?.bezeichnung, item?.oberflaeche);
  return resolved ? resolved.sortIndex : Infinity;
}

// Menschlich lesbarer Regalfach-Text für Druck/Anzeige, oder
// "Ohne Fachzuordnung", wenn nicht eindeutig bestimmbar (siehe oben - kein
// erfundener Wert).
export function getRegalPlatz(item) {
  const resolved = resolveFach(item?.bezeichnung, item?.oberflaeche);
  return resolved ? `Fach ${resolved.fach}` : "Ohne Fachzuordnung";
}
