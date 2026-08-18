import { useState } from "react";
import { groessen, ausfuehrungen } from "./constants";
import { getDescriptionOptions, rememberDescriptionIfNew } from "./descriptionsRegistry";
import {
  applyAutoTorqueHinweis,
  isHvGarnitur,
  normalizeHvDesignation,
  normalizeHvOberflaeche,
  dedupeHinweisText,
  getUnavailableFinishHint,
} from "./fasteningRules";
import SuggestionAutocomplete from "./SuggestionAutocomplete";

function prepareFields(bezeichnung, groesse, hinweis) {
  const bez = normalizeHvDesignation(bezeichnung);
  const note = dedupeHinweisText(applyAutoTorqueHinweis(hinweis, bez, groesse));
  return { bezeichnung: bez, hinweis: note };
}

/**
 * Ersetzen-Panel aus dem Lager (Sprint 2B): Auswahl der konkreten
 * Ursprungsposition bei mehreren aktiven Ursprüngen einer aggregierten
 * Lagerzeile, danach neuer fachlicher Inhalt, danach sichtbare Bestätigung.
 * Erzeugt bewusst keine automatischen Mitlaufartikel (U-Scheibe/Mutter) -
 * das würde bei einer 1:1-Ersetzung einer einzelnen Position unbeabsichtigt
 * doppelte Mitlaufpositionen erzeugen. Reine, wiederverwendete TB-Logik
 * (Vorschläge, HV-/Drehmoment-Normalisierung, Werkstoff-Hinweise).
 */
export default function LagerReplacePanel({ row, onClose, onReplace }) {
  const origins = row.items;
  const [sourceId, setSourceId] = useState(origins.length === 1 ? origins[0].id : null);
  const source = origins.find((i) => i.id === sourceId) || null;

  const [fields, setFields] = useState(() => ({
    bezeichnung: row.bezeichnung || "",
    groesse: row.groesse || "",
    laenge: row.laenge || "",
    oberflaeche: row.oberflaeche || "",
    menge: source ? Number(source.menge || 0) : "",
    hinweis: "",
  }));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const descriptionOptions = getDescriptionOptions();

  function selectSource(item) {
    setSourceId(item.id);
    setFields((f) => ({ ...f, menge: Number(item.menge || 0) }));
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

  async function handleConfirm() {
    if (!source) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = prepareFields(fields.bezeichnung, fields.groesse, fields.hinweis);
      rememberDescriptionIfNew(prepared.bezeichnung);
      await onReplace(source, {
        bezeichnung: prepared.bezeichnung,
        groesse: fields.groesse,
        laenge: fields.laenge,
        oberflaeche: fields.oberflaeche,
        hinweis: prepared.hinweis,
        menge: Number(fields.menge || 0),
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Ersetzen fehlgeschlagen.");
      setBusy(false);
    }
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

      {source && !confirming && (
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
          </div>
          {finishHint && <p className="authError finishHint">{finishHint}</p>}
          <div className="completionConfirmButtons">
            <button type="button" className="ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!fields.bezeichnung || !String(fields.menge)}
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
            <button type="button" className="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Abbrechen
            </button>
            <button type="button" onClick={handleConfirm} disabled={busy}>
              Ersetzen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
