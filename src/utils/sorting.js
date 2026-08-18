import { useState } from "react";

// Naturalvergleich für gemischte Text/Zahl-Werte (Sprint 7), z. B.
// "M4" vor "M12", Länge "20" vor "100", Position 2 vor 10 vor 20.
// Wird von allen sortierbaren Tabellenspalten benutzt, damit sich
// eingebettete Zahlen numerisch statt alphabetisch verhalten.
export function naturalCompare(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true });
}

// Gemeinsamer Sortierzustand für anklickbare Tabellenüberschriften
// (Sprint 7): ein Klick sortiert nach der jeweiligen Spalte, ein zweiter
// Klick auf dieselbe Spalte dreht die Richtung um. Kein Dialog, keine
// Einstellungen - nur der aktuelle Spalten-Schlüssel + Richtung.
export function useSortableColumns(defaultKey = null) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState("asc");

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function arrow(key) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return { sortKey, sortDir, toggleSort, arrow };
}

// Sekundärsortierung nach Größe/Länge (Sprint 2B): metrische Größen wie
// "M8"/"M10"/"M16" numerisch vergleichen statt alphabetisch (sonst würde
// "M10" vor "M8" stehen). Nicht-numerische/leere Werte landen am Ende.
function parseMetricNumber(value) {
  const s = String(value ?? "").trim();
  const m = s.match(/^m?\s*([0-9]+(?:[.,][0-9]+)?)/i);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

export function compareSizeValue(a, b) {
  const na = parseMetricNumber(a);
  const nb = parseMetricNumber(b);
  if (na !== null && nb !== null) return na - nb;
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return naturalCompare(a, b);
}

function parseLengthNumber(value) {
  const s = String(value ?? "").trim().replace(",", ".");
  return s !== "" && !Number.isNaN(Number(s)) ? Number(s) : null;
}

export function compareLengthValue(a, b) {
  const na = parseLengthNumber(a);
  const nb = parseLengthNumber(b);
  if (na !== null && nb !== null) return na - nb;
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return naturalCompare(a, b);
}

/**
 * Zentrale Sekundärsortierung (Sprint 2B), nur wirksam bei aktiver
 * Spaltensortierung des Benutzers (sortKey gesetzt):
 *   gewählte Primärspalte (Benutzerrichtung)
 *   -> Größe numerisch, immer aufsteigend
 *   -> Länge numerisch, immer aufsteigend
 *   -> Bezeichnung
 *   -> stabiler Tie-Breaker der jeweiligen Ansicht (z. B. Pos./ID)
 *
 * Ändert NICHT die bewusste Standardreihenfolge ohne aktive Sortierung
 * (z. B. Paternoster-Laufweg in Lager/Druck) - dafür ist sortKey dort leer
 * und diese Funktion wird gar nicht aufgerufen.
 *
 * `compareColumn(a, b, key)` ist der bestehende, je Ansicht unterschiedliche
 * Primärvergleich für die angeklickte Spalte; `tieBreak(a, b)` der
 * bestehende stabile Rest-Vergleich derselben Ansicht.
 */
export function compareWithSizeSecondary(
  a,
  b,
  { sortKey, sortDir, compareColumn, getSize = (x) => x.groesse, getLength = (x) => x.laenge, getName = (x) => x.bezeichnung, tieBreak = () => 0 }
) {
  const dir = sortDir === "desc" ? -1 : 1;
  const primary = dir * compareColumn(a, b, sortKey);
  if (primary !== 0) return primary;
  if (sortKey !== "groesse") {
    const bySize = compareSizeValue(getSize(a), getSize(b));
    if (bySize !== 0) return bySize;
  }
  if (sortKey !== "laenge") {
    const byLength = compareLengthValue(getLength(a), getLength(b));
    if (byLength !== 0) return byLength;
  }
  if (sortKey !== "bezeichnung") {
    const byName = naturalCompare(getName(a), getName(b));
    if (byName !== 0) return byName;
  }
  return tieBreak(a, b);
}
