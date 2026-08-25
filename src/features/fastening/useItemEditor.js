import { useState } from "react";
import {
  applyAutoTorqueHinweis,
  isHvGarnitur,
  normalizeHvDesignation,
  normalizeHvOberflaeche,
  normalizeMetricSize,
  dedupeHinweisText,
  getUnavailableFinishHint,
} from "./fasteningRules";
import {
  isOperationallyTouched,
  isReplacedItem,
  isIdentityField,
  needsReplacement,
  mengeIncreaseNeedsBestelltReset,
} from "./replacement";

function prepareFields(bezeichnung, groesse, hinweis) {
  const bez = normalizeHvDesignation(bezeichnung);
  const note = dedupeHinweisText(applyAutoTorqueHinweis(hinweis, bez, groesse));
  return { bezeichnung: bez, hinweis: note };
}

/**
 * EIN fachliches Änderungsmodell für TB UND Lager (Sprint: Lager-
 * Direktbearbeitung) - aus TechnikerEditor extrahiert, damit keine zweite,
 * ähnliche Implementierung für Lager entsteht. Verhalten unverändert
 * gegenüber dem bisherigen TB-Code:
 *
 * - ersetzte Altposition: fachlich gesperrt, keine Änderung
 * - operativ bearbeitete Position (bereit>0 oder bestellt) + fachliche
 *   Identitätsänderung (Bezeichnung/Größe/Länge/Ausführung): NICHT direkt
 *   speichern, sondern pendingReplace zur Bestätigung - Entscheidung
 *   zentral über needsReplacement() (replacement.js)
 * - Menge wird erhöht, obwohl bereits bestellt: eigene Bestätigung
 *   (pendingMengeReset), danach bestellt=false
 * - sonst: direkt speichern (auch bei operativ bearbeiteten Positionen,
 *   wenn sich nur die Menge ändert)
 *
 * `items`: die Liste, in der die zu bearbeitende Position per id gefunden
 * werden muss (TB: bauteilbezogen; Lager: projektweit, da eine Lagerzeile
 * Positionen unterschiedlicher Bauteile zusammenfassen kann).
 */
export function useItemEditor({ items, updateItem, replaceItem }) {
  // Entwurf einzelner Identitätsfelder bei operativ bereits bearbeiteten
  // Positionen: wird erst beim Verlassen des Feldes fachlich bewertet
  // (nicht bei jedem Tastendruck), damit die Ersetzen-Bestätigung nicht
  // während des Tippens aufpoppt.
  const [rowDrafts, setRowDrafts] = useState({});
  // Angehaltene Ersetzen-Bestätigung für eine konkrete Position.
  const [pendingReplace, setPendingReplace] = useState(null);
  // Angehaltene Bestätigung: Menge erhöht, obwohl bereits bestellt.
  const [pendingMengeReset, setPendingMengeReset] = useState(null);

  /** Bisherige HV-/Drehmoment-/Hinweis-Normalisierung, unverändert. */
  function resolvePatchFields(current, patch) {
    let next = { ...patch };
    const bezIn = patch.bezeichnung !== undefined ? patch.bezeichnung : current.bezeichnung;
    const grIn = patch.groesse !== undefined ? patch.groesse : current.groesse;
    const hinIn = patch.hinweis !== undefined ? patch.hinweis : current.hinweis;
    const ausfIn = patch.oberflaeche !== undefined ? patch.oberflaeche : current.oberflaeche;
    if (
      patch.bezeichnung !== undefined ||
      patch.groesse !== undefined ||
      patch.hinweis !== undefined
    ) {
      const prepared = prepareFields(bezIn, grIn, hinIn);
      if (patch.bezeichnung !== undefined || isHvGarnitur(bezIn)) {
        next.bezeichnung = prepared.bezeichnung;
      }
      next.hinweis = prepared.hinweis;
    }
    // Bewusste Bearbeitung der Bezeichnung zu HV-Garnitur: Ausführung
    // fachlich immer feuerverzinkt. Keine rückwirkende Änderung bei
    // Bearbeitung anderer Felder derselben Position.
    if (patch.bezeichnung !== undefined && isHvGarnitur(bezIn)) {
      next.oberflaeche = normalizeHvOberflaeche(bezIn, ausfIn);
    }
    if (patch.bezeichnung !== undefined || patch.oberflaeche !== undefined) {
      const warn = getUnavailableFinishHint(
        next.bezeichnung !== undefined ? next.bezeichnung : bezIn,
        ausfIn
      );
      if (warn) {
        // Nur Hinweis - keine automatische Korrektur von Werkstoff/Artikel
        alert(warn);
      }
    }
    return next;
  }

  function patchItem(id, patch) {
    const current = items.find((x) => x.id === id);
    if (!current) {
      updateItem(id, patch);
      return;
    }
    if (isReplacedItem(current)) return;

    const next = resolvePatchFields(current, patch);

    if (replaceItem && needsReplacement(current, next)) {
      setPendingReplace({ id, current, newFields: next });
      return;
    }

    if (mengeIncreaseNeedsBestelltReset(current, next)) {
      setPendingMengeReset({ id, current, patch: next });
      return;
    }

    updateItem(id, next);
  }

  function fieldDisplayValue(item, key) {
    const draft = rowDrafts[item.id];
    return draft && draft[key] !== undefined ? draft[key] : item[key] || "";
  }

  /**
   * Änderung an einem Identitätsfeld einer operativ bearbeiteten, noch
   * aktiven Position wird zunächst nur als Entwurf gehalten (kein Speichern
   * bei jedem Tastendruck) - die fachliche Ersetzen-Entscheidung erfolgt
   * erst beim Verlassen des Feldes (commitFieldDraft). Alle anderen Fälle
   * verhalten sich unverändert wie bisher (sofortiges patchItem).
   */
  function handleFieldChange(item, key, value) {
    if (isIdentityField(key) && isOperationallyTouched(item) && !isReplacedItem(item)) {
      setRowDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], [key]: value } }));
      return;
    }
    patchItem(item.id, { [key]: value });
  }

  function clearRowDraft(itemId) {
    setRowDrafts((prev) => {
      if (!prev[itemId]) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  function commitFieldDraft(item, key) {
    const draft = rowDrafts[item.id];
    if (!draft || draft[key] === undefined) return;
    // Gesamten bisherigen Entwurf der Zeile übernehmen, damit mehrere
    // gleichzeitig geänderte Identitätsfelder in einer gemeinsamen
    // Ersetzen-Bestätigung zusammengefasst werden statt mehrfach zu fragen.
    const merged = { ...draft };
    if (merged.groesse !== undefined) {
      // Erst beim Verlassen des Feldes normalisieren (nicht bei jedem
      // Tastendruck) - sonst würde z. B. "1" beim Tippen sofort zu "M1"
      // springen, bevor die zweite Ziffer eingegeben ist.
      const bez = merged.bezeichnung !== undefined ? merged.bezeichnung : item.bezeichnung;
      merged.groesse = normalizeMetricSize(bez, merged.groesse);
    }
    clearRowDraft(item.id);
    patchItem(item.id, merged);
  }

  function cancelReplace() {
    if (pendingReplace) clearRowDraft(pendingReplace.id);
    setPendingReplace(null);
  }

  async function confirmReplace() {
    if (!pendingReplace || !replaceItem) return;
    try {
      await replaceItem(pendingReplace.id, pendingReplace.newFields);
    } catch {
      return;
    } finally {
      clearRowDraft(pendingReplace.id);
      setPendingReplace(null);
    }
  }

  function cancelMengeReset() {
    setPendingMengeReset(null);
  }

  function confirmMengeReset() {
    if (!pendingMengeReset) return;
    // Bewusst: neue Menge übernehmen, aber Bestellstatus zurücksetzen -
    // der bisherige Bestellstatus deckt die zusätzliche Menge nicht ab.
    // Löst keine Mail aus (Workflow-Watcher reagiert nur auf den
    // Übergang IN "bestellt", nicht auf das Zurücksetzen).
    updateItem(pendingMengeReset.id, { ...pendingMengeReset.patch, bestellt: false });
    setPendingMengeReset(null);
  }

  return {
    patchItem,
    fieldDisplayValue,
    handleFieldChange,
    commitFieldDraft,
    pendingReplace,
    pendingMengeReset,
    cancelReplace,
    confirmReplace,
    cancelMengeReset,
    confirmMengeReset,
  };
}
