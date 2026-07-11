// Paternoster-/Regal-Reihenfolge für die Druck-Sortierung "Regal" (Sprint 5).
//
// Bewusst ohne neue Datenstruktur/DB-Feld gelöst: als Regal-Reihenfolge wird
// die Reihenfolge der Bezeichnungs-Startliste (constants.js) verwendet -
// diese Liste ist bereits vorhanden ("hinterlegt") und kann bei Bedarf dort
// direkt umsortiert werden, sobald die tatsächliche Regal-/Paternoster-
// Belegung feststeht. Keine Migration, rein clientseitige Konfiguration.
//
// Artikel, deren Bezeichnung nicht in der Liste vorkommt (z. B. freie
// Eingaben), gelten als "ohne Regalzuordnung" und werden beim Sortieren
// ans Ende gestellt.
import { descriptions } from "./constants";

function normalize(bezeichnung) {
  return String(bezeichnung || "").trim().toLowerCase();
}

// Index in der Regal-Reihenfolge (kleiner = weiter vorne im Paternoster).
// Unbekannte Bezeichnungen erhalten Infinity, damit sie beim Sortieren
// immer ans Ende rutschen.
export function regalOrderIndex(bezeichnung) {
  const idx = descriptions.findIndex((d) => d.toLowerCase() === normalize(bezeichnung));
  return idx === -1 ? Infinity : idx;
}

// Menschlich lesbarer Regalplatz (aktuell einfach die Position in der
// Reihenfolge). Leerstring, wenn keine Zuordnung bekannt ist.
export function getRegalPlatz(bezeichnung) {
  const idx = regalOrderIndex(bezeichnung);
  return Number.isFinite(idx) ? String(idx + 1) : "";
}
