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
