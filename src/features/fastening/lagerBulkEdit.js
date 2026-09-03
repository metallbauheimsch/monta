// Lager-Gesamtänderung (Praxis-Sprint): eine Änderung an einer aggregierten
// Lagerzeile gilt für ALLE zusammengefassten Ursprungspositionen, nicht nur
// für eine ausgewählte. Reine Entscheidungslogik - keine zweite,
// abweichende Kopie der bestehenden Ersetzungsregeln aus replacement.js.
//
// Bewusst AUSGESCHLOSSEN: die Gesamtmenge ("Menge") ist hier nicht
// änderbar - eine neue Gesamtmenge ließe sich nicht ohne willkürliche
// Verteilungsregel auf mehrere Ursprungspositionen (ggf. aus
// unterschiedlichen Bauteilen) aufteilen. "Vorhanden" (bereit) bleibt
// über die bestehende distribute()-Logik in stock.js geregelt - davon
// unberührt.
import { resolveIdentityPatch, normalizeMetricSize } from "./fasteningRules.js";
import { needsReplacement, buildReplacementFields, isOperationallyTouched } from "./replacement.js";

/**
 * Berechnet für jede Ursprungsposition einer aggregierten Lagerzeile das
 * konkrete Ergebnis derselben fachlichen Änderung: HV-/Drehmoment-
 * Normalisierung je Position (jede Position behält ihren eigenen
 * bisherigen Hinweis als Basis - kein erfundener gemeinsamer Text), dann
 * dieselbe zentrale Entscheidung wie bei einer Einzeländerung
 * (needsReplacement aus replacement.js): operativ bereits bearbeitete
 * Positionen mit fachlicher Identitätsänderung werden ersetzt, alle
 * anderen direkt aktualisiert.
 *
 * `rawPatch` darf niemals `menge` enthalten (siehe oben) - wird zur
 * Sicherheit ignoriert, falls doch übergeben.
 */
export function resolveBulkPatch(rowItems, rawPatch) {
  const { menge: _ignoredMenge, ...patch } = rawPatch || {};
  // Größe erst bei Übernahme normalisieren (nicht bei jedem Tastendruck) -
  // sonst würde z. B. "1" beim Tippen sofort zu "M1" springen, bevor die
  // zweite Ziffer eingegeben ist. Bezeichnung ist für alle Positionen der
  // Zeile identisch (Definition der Aggregation), außer sie wird in
  // derselben Änderung selbst mitgeändert.
  if (patch.groesse !== undefined) {
    const bezForSize = patch.bezeichnung !== undefined ? patch.bezeichnung : rowItems[0]?.bezeichnung;
    patch.groesse = normalizeMetricSize(bezForSize, patch.groesse);
  }
  const warnings = new Set();
  const directUpdates = [];
  const replacements = [];

  for (const item of rowItems) {
    const resolved = resolveIdentityPatch(item, patch, {
      onUnavailableFinish: (hint) => warnings.add(hint),
    });
    if (needsReplacement(item, resolved)) {
      replacements.push({ source: item, fields: buildReplacementFields(item, resolved) });
    } else {
      directUpdates.push({ id: item.id, fields: resolved });
    }
  }

  return { directUpdates, replacements, warnings: [...warnings] };
}

/**
 * Positionen mit abweichendem Hinweistext gegenüber der ersten Position -
 * dient der Anzeige "mehrere unterschiedliche Hinweise" beim Öffnen der
 * Sammel-Bearbeitung (kein stilles Vorbefüllen mit nur einem der Texte).
 */
export function hasMixedHinweis(rowItems) {
  if (!rowItems.length) return false;
  const first = String(rowItems[0].hinweis || "").trim();
  return rowItems.some((i) => String(i.hinweis || "").trim() !== first);
}

/** Anzahl betroffener Bauteile (für die Sicherheitsabfrage). */
export function affectedBauteilCount(rowItems) {
  return new Set(rowItems.map((i) => `${i.baugruppe || ""}|${i.bauteil || ""}`)).size;
}

/** Positionen, die bereits vorbereitet und/oder bestellt sind (für Warnhinweise). */
export function operationallyTouchedItems(rowItems) {
  return rowItems.filter(isOperationallyTouched);
}
