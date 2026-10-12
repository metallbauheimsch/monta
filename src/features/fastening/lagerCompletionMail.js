import { baugruppeStatus } from "../../utils/helpers.js";

/**
 * Lagerabschluss ohne unnötige Mail (Sprint 2B): Die bisherige
 * Lagerabschluss-Mail an stoehr@ ("wir müssen einkaufen") entfällt nur
 * dann, wenn beim Abschluss ALLE aktiven Materialpositionen des Projekts
 * vollständig bereit sind. Dieselbe zentrale Regel wie Projektampel und
 * Workflow-Watcher (baugruppeStatus: ersetzte Positionen zählen nicht).
 *
 * - offen (Rot)      -> Mail wie bisher
 * - bestellt (Gelb)  -> Mail wie bisher (Material fehlt noch)
 * - leer (Grau)      -> Mail wie bisher (keine aktiven Positionen)
 * - bereit (Grün)    -> keine Mail
 */
export function shouldSendLagerCompletedMail(items) {
  return baugruppeStatus(items || []).key !== "bereit";
}

/**
 * Entscheidung auf Basis frisch gelesener Materialdaten. Jeder Fehler beim
 * Lesen (Ausnahme, unvollständige/ungültige Antwort) führt zum bisherigen
 * Verhalten: Mail senden. Lieber eine unnötige Mail als eine fehlende.
 */
export async function decideLagerCompletedMail(loadFreshItems) {
  try {
    const items = await loadFreshItems();
    if (!Array.isArray(items)) return true;
    return shouldSendLagerCompletedMail(items);
  } catch {
    return true;
  }
}
