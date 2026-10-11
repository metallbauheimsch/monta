import { useEffect, useState } from "react";
import { isActiveItem } from "../features/fastening/replacement.js";

export function articleKey(item) {
  return [item.bezeichnung, item.groesse, item.laenge, item.oberflaeche].filter(Boolean).join(" ");
}

// Restmenge einer einzelnen Position (Gesamtmenge - bereits gelegt/vorhanden).
// Zentral definiert, damit Lager, Bestellliste und Statusampel exakt
// dieselbe Regel verwenden (Sprint 5 Erweiterung #7: keine Doppelimplementierung).
export function remainingQty(item) {
  return Math.max(0, Number(item.menge || 0) - Number(item.bereit || 0));
}

// Materialstatus einer Baugruppe (Sprint 5 Erweiterung, Logik neu gefasst in
// Sprint 7 - Korrekturen aus Praxistest):
// 🟢 Bereit   - alle benötigten Mengen sind vollständig vorhanden/geliefert
//               (keine Restmenge mehr offen)
// 🟡 Bestellt - es gibt noch Restmenge, aber alle Positionen mit Restmenge
//               sind bereits als "bestellt" markiert
// 🔴 Offen    - es gibt Restmenge, und mindestens eine dieser Positionen ist
//               noch nicht bestellt
// ⚪ ohne Positionen - Baugruppe hat (noch) keine Materialpositionen
//
// Es gibt bewusst nur diese eine Statusquelle: "bestellt" wird direkt am
// Feld material_items.bestellt der jeweiligen Position abgelesen, nicht an
// einem separaten, manuell gesetzten Baugruppen-Häkchen (das frühere
// lokale "Bestellung erfolgt"-Häkchen aus Sprint 5/6 wurde deshalb
// entfernt, siehe MONTA_DECISIONS.md, Abschnitt "Bestellung und
// Lieferung").
// Ersetzte Altpositionen (Sprint 2B: material_items.ersetzt_durch) fließen
// bewusst nicht mehr in Status-/Ampel-Berechnung ein - ihr realer bereit-/
// bestellt-Wert bleibt an der Position selbst unverändert erhalten, zählt
// aber nicht mehr als offener aktueller Bedarf. Zentral hier gelöst, damit
// Statusampel, automatischer Druckjob und Workflow-Mails (useWorkflowWatchers)
// automatisch geschützt sind, ohne das an mehreren Stellen zu wiederholen.
export function baugruppeStatus(items) {
  const active = items.filter(isActiveItem);
  if (!active.length) return { key: "leer", emoji: "⚪", label: "Keine Positionen" };
  const missing = active.filter((i) => remainingQty(i) > 0);
  if (!missing.length) return { key: "bereit", emoji: "🟢", label: "Bereit" };
  const allBestellt = missing.every((i) => i.bestellt);
  if (allBestellt) return { key: "bestellt", emoji: "🟡", label: "Bestellt" };
  return { key: "offen", emoji: "🔴", label: "Offen" };
}

// Projektampel (Sprint 1: einheitliche Ampellogik). Reine Anzeigefunktion -
// Farbe und Bezeichnung folgen jetzt derselben fachlichen Regel wie die
// Baugruppenampel (baugruppeStatus über alle Positionen des Projekts):
// Rot = offen, Gelb = bestellt, Grün = bereit, Grau = keine Positionen.
// Früher bedeutete Gelb hier "teilweise bereit" - diese Abweichung ist
// bewusst beseitigt. baugruppeStatus selbst bleibt unverändert, da
// Workflow-Mails und Druckaufträge (useWorkflowWatchers) darauf beruhen.
// pct (Materialfortschritt) wird unverändert berechnet: Anteil aktiver
// Positionen mit vorhandener Menge >= benötigter Menge.
const PROJECT_AMPEL = {
  offen: { label: "offen", cls: "red" },
  bestellt: { label: "bestellt", cls: "yellow" },
  bereit: { label: "bereit", cls: "green" },
  leer: { label: "keine Positionen", cls: "grey" },
};

export function projectStatus(project, items) {
  const own = items.filter((i) => i.project_id === project.id);
  const ampel = baugruppeStatus(own);
  const active = own.filter(isActiveItem);
  const ready = active.filter((i) => Number(i.bereit || 0) >= Number(i.menge || 0)).length;
  const pct = active.length ? Math.round((ready / active.length) * 100) : 0;
  return { key: ampel.key, emoji: ampel.emoji, pct, ...PROJECT_AMPEL[ampel.key] };
}

// Projekt-Kurzbezeichnung für Rücknavigation (z. B. "← Pergola") - dasselbe
// Feld, das auch das "Neues Projekt"-Formular als "Kurzbezeichnung"
// bezeichnet (project.name). Zentral hier definiert, damit keine der
// projektbezogenen Ansichten den Namen selbst zusammensetzt oder errät.
export function projectShortLabel(project) {
  return project?.name || "";
}

// Zentrale Erfolgsprüfung für Mehrfach-Updates (z. B. Lager: mehrere
// Positionen einer Zeile gleichzeitig aktualisieren) - u. a. Grundlage für
// die "zuletzt geändert"-Markierung im Lager, die nur nach vollständig
// erfolgreichem Speichern gesetzt werden darf.
export function allUpdatesSucceeded(results) {
  return results.every(Boolean);
}

export function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function isMobileLike() {
  return window.matchMedia("(max-width: 1024px)").matches;
}

// Tablet/Smartphone inkl. Querformat: Grenze ≤1024 px (Vorgabe Bedien-Sprint).
export function useIsNarrow() {
  const [narrow, setNarrow] = useState(() => isMobileLike());
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}
