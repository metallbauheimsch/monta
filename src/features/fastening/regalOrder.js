// Paternoster-Fachzuordnung (Anzeige / neue bzw. bewusst bearbeitete Positionen).
// Keine DB-Spalte, keine Migration bestehender Echtdaten.
//
// Architektur:
//   Sonderartikel / HV  →  dann Materialfamilie → Werkstoff → Größe → Fach
//
// Normale Befestigungsmittel (Schrauben, Muttern, Hutmuttern, Scheiben, …)
// teilen dieselbe Logik – neue Bauformen mit „schraube“/„mutter“/„scheibe“
// in der Bezeichnung folgen automatisch, ohne neuen Code.
//
// Familie + Edelstahl M4–M6 → 6; M8/M10/M12/M16/M20 → 5
// Familie + galvanisch M3–M6 → 1; M8/M10 → 27; M12/M16/M20 → 26
// Familie + feuerverzinkt (jede Größe) → Fach 9
//
// Sonderregeln (Vorrang): GiRo→10, Keilscheiben→26, Hilti HAS→2,
// Dübelfamilie (Edelstahl→4, verzinkt/feuerverzinkt→25), HV→26, …
//
// Laufweg: 27 → 26 → 25 → 24 → 10 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1

const FACH_SORT_INDEX = {
  27: 0,
  26: 1,
  25: 2,
  24: 3,
  10: 4,
  9: 5,
  7: 6,
  6: 7,
  5: 8,
  4: 9,
  3: 10,
  2: 11,
  1: 12,
};

/** Verbindliche metrische Größen der Familienregeln. */
const FAMILY_SIZES_GALV_SMALL = [3, 4, 5, 6];
const FAMILY_SIZES_EDEL_SMALL = [4, 5, 6];
const FAMILY_SIZES_EDELSTAHL = [8, 10, 12, 16, 20];
const FAMILY_SIZES_GALV_27 = [8, 10];
const FAMILY_SIZES_GALV_26 = [12, 16, 20];

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\u00a0]/g, " ")
    .replace(/\s+/g, " ");
}

function containsAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function parseMetricSize(groesse) {
  const match = String(groesse || "")
    .trim()
    .match(/^m\s*([0-9]+(?:[.,][0-9]+)?)/i);
  return match ? parseFloat(match[1].replace(",", ".")) : null;
}

function sizeInList(groesse, list) {
  const n = parseMetricSize(groesse);
  return n !== null && list.includes(n);
}

/** Edelstahl/VA/A2/A4/rostfrei in der Ausführung. */
export function isEdelstahlAusfuehrung(oberflaeche) {
  const a = normalize(oberflaeche);
  if (!a) return false;
  if (a === "edelstahl" || a === "va" || a === "rostfrei") return true;
  if (a.includes("edelstahl") || a.includes("rostfrei")) return true;
  if (/\bva\b/.test(a)) return true;
  if (/\ba2(?:-\d+)?\b/.test(a) || /\ba4(?:-\d+)?\b/.test(a)) return true;
  return false;
}

function bezSuggestsEdelstahl(bez) {
  return (
    /\bedelstahl\b/.test(bez) ||
    /\brostfrei\b/.test(bez) ||
    /\bva[\s-]/.test(bez) ||
    /^va-/.test(bez) ||
    /\ba2(?:-\d+)?\b/.test(bez) ||
    /\ba4(?:-\d+)?\b/.test(bez)
  );
}

function isGalvanisch(ausf) {
  const a = normalize(ausf);
  if (!a) return false;
  if (a.includes("feuerverzinkt")) return false; // nicht mit „verzinkt“ verwechseln
  if (a === "galvanisch" || a === "verzinkt" || a === "galv" || a === "galv.") return true;
  if (a.includes("galvanisch")) return true;
  if (/\bgalv\.?\b/.test(a)) return true;
  // z. B. „8.8/verzinkt“, „8/verzinkt“
  if (/verzinkt/.test(a)) return true;
  return false;
}

function isFeuerverzinkt(ausf) {
  return normalize(ausf) === "feuerverzinkt";
}

function isVerzinktFach25(ausf) {
  return isGalvanisch(ausf) || isFeuerverzinkt(ausf);
}

function isHvAusf(ausf) {
  return normalize(ausf) === "hv";
}

function isKeilscheibe(bez) {
  if (/keil\s*scheibe/.test(bez)) return true;
  if (/din\s*6917/.test(bez) || /din\s*6918/.test(bez)) return true;
  return false;
}

function isHiltiHas(bez) {
  if (/hilti\s*has/.test(bez)) return true;
  if (/\bhas[\s-]*u\b/.test(bez)) return true;
  if (/\bhas\b/.test(bez) && /(anker|gewinde)/.test(bez)) return true;
  return false;
}

/**
 * Dübelfamilie / mechanische Verankerungssysteme (nicht Ankerstange, nicht Hilti HAS/HIT).
 * Zuordnung nur nach Werkstoff: Edelstahl→4, verzinkt/feuerverzinkt→25.
 */
export function isDuebelFamilie(bezeichnung) {
  const bez = normalize(bezeichnung);
  if (!bez) return false;
  if (isHiltiHas(bez)) return false;
  if (/ankerstange/.test(bez)) return false;
  if (/hilti\s*hit|siebhülse|verbundmörtel|chemisch/.test(bez)) return false;
  if (/reca/.test(bez) && /verbund|mörtel|moertel/.test(bez)) return false;

  if (
    /bolzenanker|fixanker|einschlaganker|rahmendübel|betonschraube|schwerlastanker|ankerbolzen|spreizanker|durchsteckanker|verbundanker/.test(
      bez
    )
  ) {
    return true;
  }
  if (/dübel/.test(bez)) return true;
  return false;
}

/**
 * GiRo- / Gitterrost-Klammern → Fach 10 (Sonderregel vor Familienlogik).
 * „MW30/10“ allein reicht nicht – nur mit giro / gitterrost / Klammer-Kontext.
 */
export function isGitterrostHalter(bezeichnung) {
  const bez = normalize(bezeichnung);
  if (!bez) return false;
  const compact = bez.replace(/[\s/-]+/g, "");

  if (bez.includes("giro") || compact.includes("giro")) return true;
  if (bez.includes("gitterrost") || compact.includes("gitterrost")) return true;

  const hasMw30 = /mw\s*30(?:\s*\/\s*10)?/.test(bez) || /mw30(?:10)?/.test(compact);
  const isKlammerArt =
    /halteklammer|klemmhalter|\bklammer\b/.test(bez) ||
    /halteklammer|klemmhalter|klammer/.test(compact);
  if (hasMw30 && isKlammerArt) return true;

  return false;
}

function isHvGarnitur(bez) {
  return /hv[\s-]*garnitur/.test(bez) || bez === "hv";
}

/**
 * Normale Befestigungsmittel-Familie (Bauform egal).
 * Erkennung über Wortstämme – neue Schrauben-/Scheibenarten ohne Codeänderung.
 */
export function isBefestigungsFamilie(bezeichnung) {
  const bez = normalize(bezeichnung);
  if (!bez) return false;
  // Explizit keine Familie (Sonder-/Systemartikel)
  if (isKeilscheibe(bez) || isHiltiHas(bez) || isGitterrostHalter(bez)) return false;
  if (isDuebelFamilie(bez)) return false;
  if (isHvGarnitur(bez)) return false;
  if (/ankerstange|hilti\s*hit|siebhülse|verbundmörtel|chemisch/.test(bez)) return false;
  if (/niete|nagel|nägel|seilklemme|ringöse|rohrschelle|spax|trespa|gewindehülse/.test(bez)) {
    return false;
  }
  if (/reca/.test(bez) && /verbund|mörtel|moertel/.test(bez)) return false;

  if (/schraube/.test(bez)) return true;
  if (/mutter/.test(bez)) return true;
  if (/scheibe/.test(bez)) return true;
  return false;
}

function fachResult(fach) {
  return { fach, sortIndex: FACH_SORT_INDEX[fach] };
}

/**
 * @returns {{ fach: number, sortIndex: number } | null}
 */
export function resolveFach(bezeichnung, oberflaeche, groesse) {
  const bez = normalize(bezeichnung);
  const ausf = normalize(oberflaeche);
  if (!bez) return null;

  // Priorität: GiRo → Keilscheiben → Hilti HAS → Dübelfamilie → … → HV → Normfamilie
  if (isGitterrostHalter(bez)) return fachResult(10);
  if (isKeilscheibe(bez)) return fachResult(26);
  if (isHiltiHas(bez)) return fachResult(2);

  if (isDuebelFamilie(bez)) {
    if (isEdelstahlAusfuehrung(ausf) || bezSuggestsEdelstahl(bez)) return fachResult(4);
    if (isVerzinktFach25(ausf)) return fachResult(25);
    return null;
  }

  if (containsAny(bez, ["ankerstange"])) return fachResult(2);
  if (containsAny(bez, ["chemisch"])) return fachResult(2);
  if (containsAny(bez, ["reca", "verbundmörtel"])) return fachResult(2);
  if (containsAny(bez, ["hilti hit"])) return fachResult(3);
  if (containsAny(bez, ["siebhülse"])) return fachResult(3);

  if (containsAny(bez, ["nagel", "nägel"])) return fachResult(24);
  if (containsAny(bez, ["seilklemme"])) return fachResult(24);
  if (containsAny(bez, ["ringöse"])) return fachResult(24);
  if (containsAny(bez, ["rohrschelle"])) return fachResult(24);
  if (containsAny(bez, ["spax"]) && isGalvanisch(ausf)) return fachResult(24);
  if (containsAny(bez, ["trespa"])) return fachResult(7);
  if (containsAny(bez, ["niete"]) && isEdelstahlAusfuehrung(ausf)) return fachResult(7);

  // HV-Garnitur / HV-Ausführung
  if (isHvGarnitur(bez)) return fachResult(26);
  if (isBefestigungsFamilie(bez) && isHvAusf(ausf)) return fachResult(26);

  // Normale Befestigungsmittelfamilie → Werkstoff → Größe
  if (isBefestigungsFamilie(bez)) {
    if (isFeuerverzinkt(ausf)) return fachResult(9);

    if (isEdelstahlAusfuehrung(ausf) && sizeInList(groesse, FAMILY_SIZES_EDEL_SMALL)) {
      return fachResult(6);
    }
    if (isGalvanisch(ausf) && sizeInList(groesse, FAMILY_SIZES_GALV_SMALL)) {
      return fachResult(1);
    }
    if (isEdelstahlAusfuehrung(ausf) && sizeInList(groesse, FAMILY_SIZES_EDELSTAHL)) {
      return fachResult(5);
    }
    if (isGalvanisch(ausf)) {
      if (sizeInList(groesse, FAMILY_SIZES_GALV_27)) return fachResult(27);
      if (sizeInList(groesse, FAMILY_SIZES_GALV_26)) return fachResult(26);
    }
  }

  return null;
}

export function regalOrderIndex(item) {
  const resolved = resolveFach(item?.bezeichnung, item?.oberflaeche, item?.groesse);
  return resolved ? resolved.sortIndex : Infinity;
}

export function getRegalPlatz(item) {
  const resolved = resolveFach(item?.bezeichnung, item?.oberflaeche, item?.groesse);
  return resolved ? `Fach ${resolved.fach}` : "Ohne Fachzuordnung";
}
