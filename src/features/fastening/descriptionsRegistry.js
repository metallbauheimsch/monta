// Merkt sich zusätzliche Bezeichnungen, die beim Speichern einer
// Materialposition verwendet wurden, aber noch nicht in der Startliste
// (constants.js) stehen. Freie Eingabe bleibt weiterhin jederzeit erlaubt -
// dies ist nur eine Komfort-Erweiterung der Vorschlagsliste.
//
// Rein clientseitig in localStorage gehalten (kein Datenverlust-Risiko,
// keine Datenbankmigration nötig), analog zum Registry-Muster in structure.js.

import { descriptions as DEFAULT_DESCRIPTIONS } from "./constants";

const REGISTRY_KEY = "monta_descriptions_v04";

function readLearned() {
  try {
    const raw = JSON.parse(localStorage.getItem(REGISTRY_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeLearned(list) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
  } catch {
    // localStorage evtl. nicht verfügbar – Vorschlagsliste ist nur Komfort, kein Datenverlust
  }
}

// Startliste + bisher gemerkte Vorschläge, ohne Duplikate (case-insensitiv).
export function getDescriptionOptions() {
  const learned = readLearned();
  const known = new Set(DEFAULT_DESCRIPTIONS.map((d) => d.toLowerCase()));
  const extra = learned.filter((d) => !known.has(String(d).toLowerCase()));
  return [...DEFAULT_DESCRIPTIONS, ...extra];
}

// Beim Speichern einer Position aufrufen: merkt eine bisher unbekannte
// Bezeichnung dauerhaft als neuen Vorschlag.
export function rememberDescriptionIfNew(bezeichnung) {
  const name = String(bezeichnung || "").trim();
  if (!name) return;
  const existing = getDescriptionOptions();
  if (existing.some((d) => d.toLowerCase() === name.toLowerCase())) return;
  const learned = readLearned();
  writeLearned([...learned, name]);
}
