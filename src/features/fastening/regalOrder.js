// Feste Paternoster-/Regal-Zuordnung, fachlich vom Betrieb vorgegeben.
// Sprint 7 - Korrekturen aus Praxistest: vollständig neu aufgebaut, mit der
// tatsächlichen, vom Betrieb bestätigten Fachliste (vorher Sprint 6/7 nur
// eine grobe Annahme, siehe MONTA_BACKLOG.md). Bewusst weiterhin ohne
// Einstellungs-/Pflegeoberfläche und ohne Datenbanktabelle - die Zuordnung
// ändert sich nicht über die Bedienung, sondern ausschließlich durch
// Anpassung dieser einen Datei (siehe MONTA_DECISIONS.md).
//
// Verbindliche Zuordnung (Stand Sprint 7 - Korrekturen):
// Fach 1:  galvanisch verzinkte Schrauben M3-M6, Wurmschrauben, Blechmuttern
// Fach 2:  Ankerstangen, chemische Dübel, RECA Verbundmörtel
// Fach 3:  Hilti HIT, Siebhülsen
// Fach 4:  Edelstahl/VA Bolzenanker, Rahmendübel, Betonschrauben
// Fach 5:  Edelstahl/VA Schrauben M8-M16
// Fach 6:  Edelstahl/VA Schrauben M4-M6, Schlossschrauben, Ringmuttern,
//          Gewindehülsen, Senkscheiben
// Fach 7:  Edelstahl/VA Nieten, Einnietmuttern, Holzschrauben, Bohrschrauben,
//          Trespa-Befestigungen
// Fach 9:  alle feuerverzinkten Schrauben (alle Größen)
// Fach 24: galvanisch verzinkte Bohrschrauben, Nägel, SPAX verzinkt,
//          Seilklemmen, Ringösen, Rohrschellen
// Fach 25: verzinkte (galvanisch ODER feuerverzinkt) Bolzenanker,
//          Betonschrauben, Dübel, Rahmendübel
// Fach 26: galvanisch verzinkte Schrauben M12-M20, alle HV-Schrauben
// Fach 27: galvanisch verzinkte Schrauben M8-M10
// Fach 8 und Fach 10-23 sind für MONTA nicht relevant, keine Zuordnung.
//
// U-Scheiben und Sechskantmuttern (auch automatisch ergänzte Mitlaufartikel)
// liegen jeweils bei den Schrauben gleicher Größe und Ausführung und
// bekommen deshalb dasselbe Regalfach (siehe Regeln unten). Ob die Position
// manuell oder automatisch angelegt wurde, spielt keine Rolle.
//
// Grundregeln:
// - "verzinkt" bedeutet galvanisch verzinkt, außer bei Fach 25 (dort
//   ausdrücklich sowohl galvanisch verzinkt als auch feuerverzinkt).
// - "VA" bedeutet Edelstahl.
// - Fehlt eine Größenangabe in der Fachbeschreibung, gelten automatisch
//   alle Größen dieser Artikelgruppe. Nur ein ausdrücklich genannter
//   Größenbereich schränkt die Zuordnung auf diesen Bereich ein.
// - Keine Größen oder Werkstoffe erraten: Artikel, die sich nicht anhand
//   von Bezeichnung + Ausführung (+ Größe) eindeutig einer dieser Regeln
//   zuordnen lassen (z. B. unbekannte/freie Ausführungstexte wie "A2-70"
//   statt "Edelstahl"/"VA", oder Größen außerhalb der genannten Bereiche),
//   bekommen bewusst KEIN erfundenes Fach und gelten als
//   "Ohne Fachzuordnung".
//
// Paternoster-Standard-Laufweg (vom Betrieb verbindlich vorgegeben, kleinerer
// sortIndex = weiter vorne im Laufweg): 27 -> 26 -> 25 -> 24 -> 9 -> 7 -> 6 ->
// 5 -> 4 -> 3 -> 2 -> 1 -> danach wieder 27.
const FACH_SORT_INDEX = {
  27: 0,
  26: 1,
  25: 2,
  24: 3,
  9: 4,
  7: 5,
  6: 6,
  5: 7,
  4: 8,
  3: 9,
  2: 10,
  1: 11,
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function containsAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

// Erkennt metrische Größenangaben wie "M12" oder "M 8". Kein Match ->
// null (dann greift nie ein größenabhängiges Fach, statt zu raten).
function parseMetricSize(groesse) {
  const match = String(groesse || "")
    .trim()
    .match(/^m\s*([0-9]+(?:[.,][0-9]+)?)/i);
  return match ? parseFloat(match[1].replace(",", ".")) : null;
}

function sizeInRange(groesse, min, max) {
  const n = parseMetricSize(groesse);
  return n !== null && n >= min && n <= max;
}

// "verzinkt" bedeutet laut Betrieb galvanisch verzinkt (außer bei Fach 25,
// siehe unten) - deshalb als Alias für "galvanisch" behandelt.
const IS_GALVANISCH = (ausf) => ausf === "galvanisch" || ausf === "verzinkt";
const IS_FEUERVERZINKT = (ausf) => ausf === "feuerverzinkt";
// Sonderfall Fach 25: "verzinkt" umfasst hier ausdrücklich sowohl
// galvanisch verzinkt als auch feuerverzinkt.
const IS_VERZINKT_FACH25 = (ausf) =>
  ausf === "galvanisch" || ausf === "feuerverzinkt" || ausf === "verzinkt";
const IS_EDELSTAHL = (ausf) => ausf === "edelstahl" || ausf === "va";
const IS_HV = (ausf) => ausf === "hv";

// Reihenfolge der Regeln ist bewusst gewählt: spezifischere Regeln (z. B.
// "Betonschraube" für Fach 25, "Bohrschraube" für Fach 24, Edelstahl-
// Spezialartikel für Fach 6/7) werden vor den allgemeinen "Schrauben nach
// Größe"-Regeln (Fach 1/5/6/9/26/27) geprüft. Sonst würde z. B. eine
// feuerverzinkte Betonschraube fälschlich als allgemeine feuerverzinkte
// Schraube (Fach 9) statt als Fach 25 erkannt werden. Die erste zutreffende
// Regel gewinnt.
const RULES = [
  // Edelstahl/VA - einzelne, ausdrücklich benannte Artikel (alle Größen)
  { bez: ["bolzenanker", "rahmendübel", "betonschraube"], ausf: IS_EDELSTAHL, fach: 4 },
  { bez: ["schlossschraube", "ringmutter", "gewindehülse", "senkscheibe"], ausf: IS_EDELSTAHL, fach: 6 },
  { bez: ["niete", "einnietmutter", "holzschraube", "bohrschraube"], ausf: IS_EDELSTAHL, fach: 7 },
  { bez: ["trespa"], fach: 7 }, // kein Werkstoff genannt -> keine Einschränkung

  // Chemische Befestigungen (kein Werkstoff/keine Größe genannt)
  { bez: ["ankerstange"], fach: 2 },
  { bez: ["chemisch"], fach: 2 }, // "chemischer/chemische Dübel"
  { bez: ["reca", "verbundmörtel"], fach: 2 },
  { bez: ["hilti hit"], fach: 3 },
  { bez: ["siebhülse"], fach: 3 },

  // Verzinkte Anker/Dübel (galvanisch ODER feuerverzinkt, alle Größen)
  { bez: ["bolzenanker", "betonschraube", "rahmendübel", "dübel"], ausf: IS_VERZINKT_FACH25, fach: 25 },

  // Fach 24 - einzelne, ausdrücklich benannte Artikel
  { bez: ["bohrschraube"], ausf: IS_GALVANISCH, fach: 24 },
  { bez: ["spax"], ausf: IS_GALVANISCH, fach: 24 },
  { bez: ["nagel", "nägel"], fach: 24 },
  { bez: ["seilklemme"], fach: 24 },
  { bez: ["ringöse"], fach: 24 },
  { bez: ["rohrschelle"], fach: 24 },

  // Fach 1 - sonstige, ausdrücklich benannte Artikel (kein Werkstoff genannt)
  { bez: ["wurmschraube"], fach: 1 },
  { bez: ["blechmutter"], fach: 1 },

  // Edelstahl/VA Schrauben nach Größe
  { bez: ["schraube"], ausf: IS_EDELSTAHL, groesse: [4, 6], fach: 6 },
  { bez: ["schraube"], ausf: IS_EDELSTAHL, groesse: [8, 16], fach: 5 },

  // Galvanisch verzinkte Schrauben nach Größe
  { bez: ["schraube"], ausf: IS_GALVANISCH, groesse: [3, 6], fach: 1 },
  { bez: ["schraube"], ausf: IS_GALVANISCH, groesse: [8, 10], fach: 27 },
  { bez: ["schraube"], ausf: IS_GALVANISCH, groesse: [12, 20], fach: 26 },

  // HV-Schrauben, unabhängig von der Größe
  { bez: ["schraube"], ausf: IS_HV, fach: 26 },

  // Feuerverzinkte Schrauben, unabhängig von der Größe
  { bez: ["schraube"], ausf: IS_FEUERVERZINKT, fach: 9 },

  // U-Scheiben / Sechskantmuttern (auch automatisch ergänzte Mitlaufartikel):
  // liegen fachlich bei den Schrauben gleicher Größe und Ausführung -
  // deshalb dieselben Größen-/Ausführungsregeln wie bei Schrauben.
  // Bezeichnungen bewusst eng gehalten (nicht pauschal "mutter"/"scheibe"),
  // damit speziellere Artikel (Blechmutter, Ringmutter, Senkscheibe usw.)
  // weiter über die Regeln oben greifen.
  { bez: ["u-scheibe", "unterlegscheibe", "sechskantmutter"], ausf: IS_EDELSTAHL, groesse: [4, 6], fach: 6 },
  { bez: ["u-scheibe", "unterlegscheibe", "sechskantmutter"], ausf: IS_EDELSTAHL, groesse: [8, 16], fach: 5 },
  { bez: ["u-scheibe", "unterlegscheibe", "sechskantmutter"], ausf: IS_GALVANISCH, groesse: [3, 6], fach: 1 },
  { bez: ["u-scheibe", "unterlegscheibe", "sechskantmutter"], ausf: IS_GALVANISCH, groesse: [8, 10], fach: 27 },
  { bez: ["u-scheibe", "unterlegscheibe", "sechskantmutter"], ausf: IS_GALVANISCH, groesse: [12, 20], fach: 26 },
  { bez: ["u-scheibe", "unterlegscheibe", "sechskantmutter"], ausf: IS_HV, fach: 26 },
  { bez: ["u-scheibe", "unterlegscheibe", "sechskantmutter"], ausf: IS_FEUERVERZINKT, fach: 9 },
];

function matchesRule(rule, bez, ausf, groesse) {
  if (!containsAny(bez, rule.bez)) return false;
  if (rule.ausf && !rule.ausf(ausf)) return false;
  if (rule.groesse && !sizeInRange(groesse, rule.groesse[0], rule.groesse[1])) return false;
  return true;
}

// Ermittelt Fach + Sortier-Index für eine Position (Bezeichnung + Ausführung
// + Größe). Gibt null zurück, wenn keine der verbindlichen Regeln eindeutig
// zutrifft - dann gibt es bewusst kein erfundenes Fach.
function resolveFach(bezeichnung, oberflaeche, groesse) {
  const bez = normalize(bezeichnung);
  const ausf = normalize(oberflaeche);
  if (!bez) return null;
  for (const rule of RULES) {
    if (matchesRule(rule, bez, ausf, groesse)) {
      return { fach: rule.fach, sortIndex: FACH_SORT_INDEX[rule.fach] };
    }
  }
  return null;
}

// Sortier-Reihenfolge im Paternoster (kleiner = weiter vorne). Positionen
// ohne eindeutige Zuordnung landen beim Sortieren immer am Ende.
export function regalOrderIndex(item) {
  const resolved = resolveFach(item?.bezeichnung, item?.oberflaeche, item?.groesse);
  return resolved ? resolved.sortIndex : Infinity;
}

// Menschlich lesbarer Regalfach-Text für Lager/Druck, oder
// "Ohne Fachzuordnung", wenn nicht eindeutig bestimmbar (siehe oben - kein
// erfundener Wert).
export function getRegalPlatz(item) {
  const resolved = resolveFach(item?.bezeichnung, item?.oberflaeche, item?.groesse);
  return resolved ? `Fach ${resolved.fach}` : "Ohne Fachzuordnung";
}
