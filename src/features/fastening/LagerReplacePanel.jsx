import { useState } from "react";
import { groessen, ausfuehrungen } from "./constants";
import { getDescriptionOptions, rememberDescriptionIfNew } from "./descriptionsRegistry";
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
  needsReplacement,
  mengeIncreaseNeedsBestelltReset,
  fieldsFromOrigin,
} from "./replacement";
import SuggestionAutocomplete from "./SuggestionAutocomplete";

function prepareFields(bezeichnung, groesse, hinweis) {
  const bez = normalizeHvDesignation(bezeichnung);
  const note = dedupeHinweisText(applyAutoTorqueHinweis(hinweis, bez, groesse));
  return { bezeichnung: bez, hinweis: note };
}

/**
 * Ersetzen-Panel aus dem Lager (Sprint 2B, überarbeitet Sprint 2C nach
 * GPT-Code-Review): Auswahl der konkreten Ursprungsposition bei mehreren
 * aktiven Ursprüngen einer aggregierten Lagerzeile, danach neuer
 * fachlicher Inhalt, danach EINE zentrale Entscheidung (needsReplacement,
 * dieselbe wie in TB):
 *
 *   unberührte Position (bereit=0 und bestellt=false)
 *     -> bestehende Zeile direkt ändern (onDirectUpdate), keine Historie
 *   operativ bearbeitete Position + fachliche Identitätsänderung
 *     -> sichere atomare Ersatzlogik (onReplace)
 *   operativ bearbeitete Position, nur Menge erhöht, bereits bestellt
 *     -> eigene kleine Bestätigung, danach bestellt=false
 *
 * Erzeugt bewusst keine automatischen Mitlaufartikel (U-Scheibe/Mutter) -
 * das würde bei einer 1:1-Änderung einer einzelnen Position unbeabsichtigt
 * doppelte Mitlaufpositionen erzeugen. Reine, wiederverwendete TB-Logik
 * (Vorschläge, HV-/Drehmoment-Normalisierung, Werkstoff-Hinweise).
 */
export default function LagerReplacePanel({ row, onClose, onReplace, onDirectUpdate }) {
  const origins = row.items;
  const [sourceId, setSourceId] = useState(origins.length === 1 ? origins[0].id : null);
  const source = origins.find((i) => i.id === sourceId) || null;

  const [fields, setFields] = useState(() => fieldsFromOrigin(row, source));
  const [pendingPatch, setPendingPatch] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingMengeReset, setConfirmingMengeReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const descriptionOptions = getDescriptionOptions();

  function selectSource(item) {
    setSourceId(item.id);
    setFields(fieldsFromOrigin(row, item));
  }

  function set(k, v) {
    setFields((f) => {
      const next = { ...f, [k]: v };
      if (k === "bezeichnung" || k === "groesse") {
        const bez = k === "bezeichnung" ? normalizeHvDesignation(v) : normalizeHvDesignation(f.bezeichnung);
        const gr = k === "groesse" ? v : f.groesse;
        if (k === "bezeichnung" && isHvGarnitur(v)) {
          next.bezeichnung = bez;
          next.oberflaeche = normalizeHvOberflaeche(bez, f.oberflaeche);
        }
        next.hinweis = applyAutoTorqueHinweis(k === "hinweis" ? v : f.hinweis, bez, gr);
      }
      return next;
    });
  }

  const finishHint = getUnavailableFinishHint(fields.bezeichnung, fields.oberflaeche);

  function buildPatch() {
    const prepared = prepareFields(fields.bezeichnung, fields.groesse, fields.hinweis);
    // Größendarstellung nur bei eindeutig erkanntem metrischem Gewindeartikel
    // standardisieren (m12/M 12/12 → M12) - bewusste Bearbeitung, wie bei
    // der HV-/Drehmoment-Normalisierung oben.
    const finalGroesse = normalizeMetricSize(prepared.bezeichnung, fields.groesse);
    return {
      bezeichnung: prepared.bezeichnung,
      groesse: finalGroesse,
      laenge: fields.laenge,
      oberflaeche: fields.oberflaeche,
      hinweis: prepared.hinweis,
      important_note: Boolean(fields.important_note),
      menge: Number(fields.menge || 0),
    };
  }

  function handleWeiter() {
    if (!source) return;
    if (fields.important_note && !String(fields.hinweis || "").trim()) {
      setError("Bitte zuerst einen Hinweis eintragen.");
      return;
    }
    setError(null);
    const patch = buildPatch();
    if (needsReplacement(source, patch)) {
      setPendingPatch(patch);
      setConfirming(true);
      return;
    }
    if (mengeIncreaseNeedsBestelltReset(source, patch)) {
      setPendingPatch(patch);
      setConfirmingMengeReset(true);
      return;
    }
    applyDirectUpdate(patch);
  }

  async function applyDirectUpdate(patch) {
    setBusy(true);
    setError(null);
    try {
      rememberDescriptionIfNew(patch.bezeichnung);
      await onDirectUpdate(source.id, patch);
      onClose();
    } catch (err) {
      setError(err?.message || "Speichern fehlgeschlagen.");
      setBusy(false);
    }
  }

  async function handleConfirmReplace() {
    if (!pendingPatch) return;
    setBusy(true);
    setError(null);
    try {
      rememberDescriptionIfNew(pendingPatch.bezeichnung);
      await onReplace(source, pendingPatch);
      onClose();
    } catch (err) {
      setError(err?.message || "Ersetzen fehlgeschlagen.");
      setBusy(false);
    }
  }

  function handleConfirmMengeReset() {
    if (!pendingPatch) return;
    setConfirmingMengeReset(false);
    applyDirectUpdate({ ...pendingPatch, bestellt: false });
  }

  return (
    <div className="card replacePanel">
      <div className="row">
        <h3>Position ersetzen</h3>
        <button type="button" className="ghost" onClick={onClose}>
          Schließen
        </button>
      </div>

      {!source && (
        <>
          <p className="hint">
            Diese Lagerzeile fasst mehrere Ursprungspositionen zusammen. Bitte genau eine
            auswählen - eine Änderung darf nie alle gleichzeitig betreffen.
          </p>
          <div className="tableWrap">
            <table>
              <tbody>
                <tr>
                  <th>Baugruppe</th>
                  <th>Bauteil</th>
                  <th>Pos.</th>
                  <th>Menge</th>
                  <th>Vorhanden</th>
                  <th>Bestellt</th>
                  <th></th>
                </tr>
                {origins.map((i) => (
                  <tr key={i.id}>
                    <td>{i.baugruppe}</td>
                    <td>{i.bauteil}</td>
                    <td>{i.pos}</td>
                    <td>{i.menge}</td>
                    <td>{i.bereit || 0}</td>
                    <td>{i.bestellt ? "Ja" : "Nein"}</td>
                    <td>
                      <button type="button" onClick={() => selectSource(i)}>
                        Auswählen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {source && !confirming && !confirmingMengeReset && (
        <>
          <p className="hint">
            Ursprung: {source.baugruppe} · {source.bauteil} · Pos. {source.pos}
            {origins.length > 1 && (
              <button type="button" className="ghost" onClick={() => setSourceId(null)}>
                Andere Position wählen
              </button>
            )}
          </p>
          <div className="entryGrid">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Menge"
              value={fields.menge}
              onChange={(e) => set("menge", e.target.value)}
            />
            <SuggestionAutocomplete
              value={fields.bezeichnung}
              onChange={(v) => set("bezeichnung", v)}
              onCommit={rememberDescriptionIfNew}
              options={descriptionOptions}
              placeholder="Bezeichnung"
            />
            <SuggestionAutocomplete
              value={fields.groesse}
              onChange={(v) => set("groesse", v)}
              options={groessen}
              placeholder="Größe"
            />
            <input
              placeholder="Länge"
              value={fields.laenge}
              onChange={(e) => set("laenge", e.target.value)}
            />
            <SuggestionAutocomplete
              value={fields.oberflaeche}
              onChange={(v) => set("oberflaeche", v)}
              options={ausfuehrungen}
              placeholder="Ausführung"
            />
            <input
              placeholder="Hinweis"
              value={fields.hinweis}
              onChange={(e) => set("hinweis", e.target.value)}
            />
            <label className="checkboxLine entryImportantNote" title="Wichtiger Hinweis">
              <input
                type="checkbox"
                checked={Boolean(fields.important_note)}
                onChange={(e) => {
                  if (e.target.checked && !String(fields.hinweis || "").trim()) {
                    setError("Bitte zuerst einen Hinweis eintragen.");
                    return;
                  }
                  set("important_note", e.target.checked);
                }}
              />
              Wichtig
            </label>
          </div>
          {finishHint && <p className="authError finishHint">{finishHint}</p>}
          {error && <p className="hint dangerText">{error}</p>}
          <div className="completionConfirmButtons">
            <button type="button" className="ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleWeiter}
              disabled={!fields.bezeichnung || !String(fields.menge) || busy}
            >
              Weiter
            </button>
          </div>
        </>
      )}

      {source && confirming && (
        <div className="completionConfirm">
          <div>
            <p>Diese Materialposition wirklich ersetzen?</p>
            <p>
              Die Änderung wird als neuer aktueller Bedarf in TB, Prüfung, Lager, Warenkorb und
              Druck verwendet.
            </p>
            {Number(source.bereit || 0) > 0 && (
              <p>
                {source.bereit} × {source.bezeichnung} {source.groesse}
                {source.laenge ? `×${source.laenge}` : ""} bleiben als vorbereitete Altposition
                erhalten.
              </p>
            )}
            {source.bestellt && (
              <p className="dangerText">
                Diese Position wurde bereits bestellt. Bestellung ggf. manuell stornieren oder
                korrigieren.
              </p>
            )}
            {error && <p className="hint dangerText">{error}</p>}
          </div>
          <div className="completionConfirmButtons">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={busy}
            >
              Abbrechen
            </button>
            <button type="button" onClick={handleConfirmReplace} disabled={busy}>
              Ersetzen
            </button>
          </div>
        </div>
      )}

      {source && confirmingMengeReset && (
        <div className="completionConfirm">
          <div>
            <p>
              Die benötigte Menge wurde erhöht. Der bisherige Bestellstatus deckt die zusätzliche
              Menge möglicherweise nicht ab.
            </p>
            <p>Menge übernehmen und Bestellstatus zurücksetzen?</p>
            {error && <p className="hint dangerText">{error}</p>}
          </div>
          <div className="completionConfirmButtons">
            <button
              type="button"
              className="ghost"
              onClick={() => setConfirmingMengeReset(false)}
              disabled={busy}
            >
              Abbrechen
            </button>
            <button type="button" onClick={handleConfirmMengeReset} disabled={busy}>
              Bestätigen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
