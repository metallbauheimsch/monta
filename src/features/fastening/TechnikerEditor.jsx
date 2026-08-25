import { useMemo, useRef, useState } from "react";
import { ausfuehrungen, groessen } from "./constants";
import { getDescriptionOptions, rememberDescriptionIfNew } from "./descriptionsRegistry";
import { allocatePositions } from "./technikerUtils";
import {
  isHvGarnitur,
  normalizeHvDesignation,
  normalizeHvOberflaeche,
  normalizeMetricSize,
  buildMitlaufItems,
  mitlaufNeedsOberflaeche,
  getUnavailableFinishHint,
  dedupeHinweisText,
  applyAutoTorqueHinweis,
} from "./fasteningRules";
import { formatEinbauort } from "../../utils/structure";
import { naturalCompare, useSortableColumns, compareWithSizeSecondary } from "../../utils/sorting";
import { filterBySearch, sizeLengthSearchParts } from "../../utils/textSearch";
import {
  isReplacedItem,
  isReferencedAsReplacement,
  formatReplacedHint,
  REPLACEMENT_TARGET_LOCKED_DELETE_MESSAGE,
} from "./replacement";
import { useItemEditor } from "./useItemEditor";
import SearchField from "../../components/SearchField";
import SuggestionAutocomplete from "./SuggestionAutocomplete";

// Neue, normale Position: Ausführung bewusst leer – Benutzer wählt selbst.
// Ausnahme HV-Garnitur (siehe set()/patchItem): dort automatisch feuerverzinkt.
const emptyFields = {
  menge: "",
  bezeichnung: "",
  groesse: "",
  laenge: "",
  oberflaeche: "",
  hinweis: "",
  important_note: false,
};

function posValue(item) {
  const n = parseInt(String(item.pos ?? "").trim(), 10);
  return Number.isNaN(n) ? Infinity : n;
}

function compareByColumn(a, b, key) {
  // important_note niemals Sortierschlüssel
  if (key === "important_note") return 0;
  if (key === "pos" || key === "menge") return (Number(a[key]) || 0) - (Number(b[key]) || 0);
  return naturalCompare(a[key], b[key]);
}

/**
 * Stabile Reihenfolge: ohne aktive Spaltensortierung nach Pos. (unverändert).
 * Mit aktiver Spaltensortierung (Sprint 2B): gewählte Spalte → Größe/Länge
 * numerisch → Bezeichnung → Pos./id als stabiler Tie-Breaker.
 */
function stableSortItems(items, sortKey, sortDir) {
  if (!sortKey) {
    return [...items].sort((a, b) => posValue(a) - posValue(b));
  }
  return [...items].sort((a, b) =>
    compareWithSizeSecondary(a, b, {
      sortKey,
      sortDir,
      compareColumn: compareByColumn,
      tieBreak: (x, y) =>
        posValue(x) - posValue(y) || String(x.id || "").localeCompare(String(y.id || "")),
    })
  );
}

function prepareFields(bezeichnung, groesse, hinweis) {
  const bez = normalizeHvDesignation(bezeichnung);
  const note = dedupeHinweisText(applyAutoTorqueHinweis(hinweis, bez, groesse));
  return { bezeichnung: bez, hinweis: note };
}

export default function TechnikerEditor({
  items,
  allProjectItems,
  addItem,
  updateItem,
  deleteItem,
  replaceItem,
  baugruppe,
  bauteil,
  project,
}) {
  const [draft, setDraft] = useState(() => ({ ...emptyFields, autoMitlauf: true }));
  const [search, setSearch] = useState("");
  const mengeRef = useRef(null);
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);
  const descriptionOptions = getDescriptionOptions();

  // Zentrale Bearbeitungsentscheidung (direkt/Ersetzen/Mengenreset), jetzt
  // gemeinsam mit Lager genutzt (Sprint: Lager-Direktbearbeitung) - siehe
  // useItemEditor.js. Verhalten hier unverändert gegenüber dem bisherigen
  // lokalen Code.
  const {
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
  } = useItemEditor({ items, updateItem, replaceItem });

  const filteredItems = useMemo(
    () =>
      filterBySearch(items, search, (i) => [
        project?.nr,
        project?.name,
        i.pos,
        baugruppe,
        bauteil,
        i.bezeichnung,
        i.groesse,
        i.laenge,
        i.oberflaeche,
        i.hinweis,
        i.important_note ? "wichtig" : "",
        `Pos ${i.pos}`,
        `Pos. ${i.pos}`,
        ...sizeLengthSearchParts(i.groesse, i.laenge),
      ]),
    [items, search, baugruppe, bauteil, project]
  );

  const sortedItems = useMemo(
    () => stableSortItems(filteredItems, sortKey, sortDir),
    [filteredItems, sortKey, sortDir]
  );

  function set(k, v) {
    setDraft((d) => {
      const next = { ...d, [k]: v };
      if (k === "bezeichnung" || k === "groesse") {
        const bez = k === "bezeichnung" ? normalizeHvDesignation(v) : normalizeHvDesignation(d.bezeichnung);
        const gr = k === "groesse" ? v : d.groesse;
        if (k === "bezeichnung" && isHvGarnitur(v)) {
          next.bezeichnung = bez;
          // HV-Garnitur ist fachlich immer feuerverzinkt (neue Position).
          next.oberflaeche = normalizeHvOberflaeche(bez, d.oberflaeche);
        }
        next.hinweis = applyAutoTorqueHinweis(k === "hinweis" ? v : d.hinweis, bez, gr);
      }
      return next;
    });
  }

  function focusFirstField() {
    requestAnimationFrame(() => mengeRef.current?.focus());
  }

  function findProjectItemById(id) {
    return (allProjectItems || items).find((x) => x.id === id) || null;
  }

  function replacedHint(item) {
    if (!isReplacedItem(item)) return null;
    const repl = findProjectItemById(item.ersetzt_durch);
    return formatReplacedHint(repl);
  }

  /** Löschschutz (Sprint 2C): Position ist Ziel einer Ersetzung (wird von einer Altposition referenziert). */
  function isDeleteLocked(item) {
    return isReferencedAsReplacement(item, allProjectItems || items);
  }

  async function submit(e) {
    e.preventDefault();
    const einbauort = formatEinbauort(baugruppe, bauteil);
    const posBasis = allProjectItems || items;
    const menge = Number(draft.menge || 0);
    const prepared = prepareFields(draft.bezeichnung, draft.groesse, draft.hinweis);
    // Größendarstellung nur bei eindeutig erkanntem metrischem Gewindeartikel
    // standardisieren (m12/M 12/12 → M12); alle anderen Größen (z. B.
    // Holzschraube "8") bleiben unverändert. Gilt nur für die neu angelegte
    // Position - keine rückwirkende Änderung bestehender Daten.
    const finalGroesse = normalizeMetricSize(prepared.bezeichnung, draft.groesse);
    const companions = draft.autoMitlauf
      ? buildMitlaufItems(prepared.bezeichnung, {
          groesse: finalGroesse,
          oberflaeche: draft.oberflaeche,
          menge,
        })
      : [];

    // Praxis-Feedback: automatisch ergänzte U-Scheiben/Muttern übernehmen die
    // Ausführung des Hauptartikels nur im Moment der Anlage - es gibt keine
    // gespeicherte Verknüpfung zurück zur Hauptposition, über die eine
    // spätere Ausführungsänderung sicher nachgezogen werden könnte (siehe
    // Sprint-Abschlussbericht). Damit Mitlaufpositionen nicht mit dauerhaft
    // leerer Ausführung entstehen, wird die Anlage hier blockiert, solange
    // eine Ausführung fehlt - wie beim bestehenden Hinweis-Pflichtfeld unten.
    if (draft.autoMitlauf && mitlaufNeedsOberflaeche(prepared.bezeichnung, draft.oberflaeche)) {
      alert(
        "Bitte zuerst eine Ausführung wählen, damit U-Scheibe/Mutter automatisch dieselbe Ausführung " +
          'erhalten (oder "U-Scheibe/Mutter automatisch ergänzen" abwählen).'
      );
      return;
    }

    const [mainPos, ...companionPos] = allocatePositions(posBasis, 1 + companions.length);

    rememberDescriptionIfNew(prepared.bezeichnung);

    if (draft.important_note && !String(prepared.hinweis || "").trim()) {
      alert("Bitte zuerst einen Hinweis eintragen.");
      return;
    }

    try {
      await addItem({
        pos: mainPos,
        einbauort,
        menge,
        bezeichnung: prepared.bezeichnung,
        groesse: finalGroesse,
        laenge: draft.laenge,
        oberflaeche: draft.oberflaeche,
        hinweis: prepared.hinweis,
        important_note: Boolean(draft.important_note),
      });

      for (let idx = 0; idx < companions.length; idx += 1) {
        const c = companions[idx];
        await addItem({
          pos: companionPos[idx],
          einbauort,
          menge: c.menge,
          bezeichnung: c.bezeichnung,
          groesse: c.groesse,
          laenge: "",
          oberflaeche: c.oberflaeche,
          hinweis: "Automatisch ergänzt",
        });
      }
    } catch {
      return;
    }

    // Ausführung wird bewusst NICHT aus der vorherigen Zeile übernommen –
    // jede neue Position startet mit leerer Ausführung.
    setDraft({ ...emptyFields, autoMitlauf: draft.autoMitlauf });
    focusFirstField();
  }

  const finishHint = getUnavailableFinishHint(draft.bezeichnung, draft.oberflaeche);

  return (
    <>
      <div className="card pcOnly">
        <h2>TB-Erfassung</h2>
        <form className="entryGrid" onSubmit={submit}>
          <input
            ref={mengeRef}
            type="number"
            inputMode="numeric"
            placeholder="Menge"
            value={draft.menge}
            onChange={(e) => set("menge", e.target.value)}
            required
          />
          <SuggestionAutocomplete
            value={draft.bezeichnung}
            onChange={(v) => set("bezeichnung", v)}
            onCommit={rememberDescriptionIfNew}
            options={descriptionOptions}
            placeholder="Bezeichnung"
            required
          />
          <SuggestionAutocomplete
            value={draft.groesse}
            onChange={(v) => set("groesse", v)}
            options={groessen}
            placeholder="Größe"
          />
          <input
            placeholder="Länge"
            value={draft.laenge}
            onChange={(e) => set("laenge", e.target.value)}
          />
          <SuggestionAutocomplete
            value={draft.oberflaeche}
            onChange={(v) => set("oberflaeche", v)}
            options={ausfuehrungen}
            placeholder="Ausführung"
          />
          <input
            placeholder="Hinweis / Drehmoment"
            value={draft.hinweis}
            onChange={(e) => set("hinweis", e.target.value)}
          />
          <label className="checkboxLine entryImportantNote" title="Wichtiger Hinweis">
            <input
              type="checkbox"
              checked={Boolean(draft.important_note)}
              onChange={(e) => {
                if (e.target.checked && !String(draft.hinweis || "").trim()) {
                  alert("Bitte zuerst einen Hinweis eintragen.");
                  return;
                }
                set("important_note", e.target.checked);
              }}
            />
            Wichtig
          </label>
          <button>+ Eintragen</button>
        </form>
        {finishHint && <p className="authError finishHint">{finishHint}</p>}
        <label className="checkboxLine">
          <input
            type="checkbox"
            checked={draft.autoMitlauf}
            onChange={(e) => set("autoMitlauf", e.target.checked)}
          />
          U-Scheibe/Mutter automatisch ergänzen
        </label>
      </div>

      <div className="card">
        <h2>Erfasste Positionen{bauteil ? ` · ${bauteil}` : ""}</h2>
        <SearchField value={search} onChange={setSearch} />
        {pendingReplace && (
          <div className="completionConfirm replaceConfirm">
            <div>
              <p>
                Diese Position wurde bereits{" "}
                {pendingReplace.current.bereit > 0 && pendingReplace.current.bestellt
                  ? "vorbereitet und bestellt"
                  : pendingReplace.current.bereit > 0
                  ? "vorbereitet"
                  : "bestellt"}
                .
              </p>
              {pendingReplace.current.bereit > 0 && (
                <p>
                  {pendingReplace.current.bereit} × {pendingReplace.current.bezeichnung}{" "}
                  {pendingReplace.current.groesse}
                  {pendingReplace.current.laenge ? `×${pendingReplace.current.laenge}` : ""} bleiben
                  als vorbereitete Altposition erhalten.
                </p>
              )}
              <p>
                Die neue Position{" "}
                {pendingReplace.newFields.bezeichnung ?? pendingReplace.current.bezeichnung}{" "}
                {pendingReplace.newFields.groesse ?? pendingReplace.current.groesse}
                {(pendingReplace.newFields.laenge ?? pendingReplace.current.laenge)
                  ? `×${pendingReplace.newFields.laenge ?? pendingReplace.current.laenge}`
                  : ""}{" "}
                startet im Lager mit 0.
              </p>
              {pendingReplace.current.bestellt && (
                <p className="dangerText">
                  Diese Position wurde bereits bestellt. Bestellung ggf. manuell stornieren oder
                  korrigieren.
                </p>
              )}
              <p>Position wirklich ersetzen?</p>
            </div>
            <div className="completionConfirmButtons">
              <button type="button" className="ghost" onClick={cancelReplace}>
                Abbrechen
              </button>
              <button type="button" onClick={confirmReplace}>
                Ersetzen
              </button>
            </div>
          </div>
        )}
        {pendingMengeReset && (
          <div className="completionConfirm replaceConfirm">
            <div>
              <p>
                Die benötigte Menge wurde erhöht. Der bisherige Bestellstatus deckt die
                zusätzliche Menge möglicherweise nicht ab.
              </p>
              <p>Menge übernehmen und Bestellstatus zurücksetzen?</p>
            </div>
            <div className="completionConfirmButtons">
              <button type="button" className="ghost" onClick={cancelMengeReset}>
                Abbrechen
              </button>
              <button type="button" onClick={confirmMengeReset}>
                Bestätigen
              </button>
            </div>
          </div>
        )}
        <div className="tableWrap">
          <table className="editTable">
            <tbody>
              <tr>
                <th className="sortableTh" onClick={() => toggleSort("pos")}>
                  Pos.{arrow("pos")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("menge")}>
                  Menge{arrow("menge")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("bezeichnung")}>
                  Bezeichnung{arrow("bezeichnung")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("groesse")}>
                  Größe{arrow("groesse")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("laenge")}>
                  Länge{arrow("laenge")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("oberflaeche")}>
                  Ausführung{arrow("oberflaeche")}
                </th>
                <th>Hinweis</th>
                <th title="Wichtiger Hinweis">Wichtig</th>
                <th></th>
              </tr>
              {sortedItems.map((i) => {
                const replaced = isReplacedItem(i);
                const deleteLocked = replaced || isDeleteLocked(i);
                return (
                <tr key={i.id} className={replaced ? "replacedRow" : undefined}>
                  <td className="posCell">
                    {i.pos}
                    {replaced && <div className="replacedBadge">{replacedHint(i)}</div>}
                  </td>
                  <td>
                    {replaced ? (
                      <span className="replacedFieldText">{i.menge}</span>
                    ) : (
                      <input
                        type="number"
                        value={i.menge || 0}
                        onChange={(e) => patchItem(i.id, { menge: Number(e.target.value) })}
                      />
                    )}
                  </td>
                  <td className="suggestionCell">
                    {replaced ? (
                      <span className="replacedFieldText">{i.bezeichnung}</span>
                    ) : (
                      <SuggestionAutocomplete
                        value={fieldDisplayValue(i, "bezeichnung")}
                        onChange={(v) => handleFieldChange(i, "bezeichnung", v)}
                        onCommit={(v) => {
                          rememberDescriptionIfNew(v);
                          commitFieldDraft(i, "bezeichnung");
                        }}
                        options={descriptionOptions}
                        placeholder="Bezeichnung"
                        ellipsis
                      />
                    )}
                  </td>
                  <td>
                    {replaced ? (
                      <span className="replacedFieldText">{i.groesse}</span>
                    ) : (
                      <input
                        value={fieldDisplayValue(i, "groesse")}
                        onChange={(e) => handleFieldChange(i, "groesse", e.target.value)}
                        onBlur={() => commitFieldDraft(i, "groesse")}
                      />
                    )}
                  </td>
                  <td>
                    {replaced ? (
                      <span className="replacedFieldText">{i.laenge}</span>
                    ) : (
                      <input
                        value={fieldDisplayValue(i, "laenge")}
                        onChange={(e) => handleFieldChange(i, "laenge", e.target.value)}
                        onBlur={() => commitFieldDraft(i, "laenge")}
                      />
                    )}
                  </td>
                  <td className="suggestionCell">
                    {replaced ? (
                      <span className="replacedFieldText">{i.oberflaeche}</span>
                    ) : (
                      <SuggestionAutocomplete
                        value={fieldDisplayValue(i, "oberflaeche")}
                        onChange={(v) => handleFieldChange(i, "oberflaeche", v)}
                        onCommit={() => commitFieldDraft(i, "oberflaeche")}
                        options={ausfuehrungen}
                        placeholder="Ausführung"
                        ellipsis
                      />
                    )}
                  </td>
                  <td>
                    {replaced ? (
                      <span className={i.important_note ? "importantNote" : "replacedFieldText"}>
                        {i.hinweis}
                      </span>
                    ) : (
                      <input
                        className={i.important_note ? "importantNoteInput" : ""}
                        value={i.hinweis || ""}
                        onChange={(e) => patchItem(i.id, { hinweis: e.target.value })}
                        onBlur={(e) => {
                          const cleaned = dedupeHinweisText(e.target.value);
                          if (cleaned !== String(i.hinweis || "")) {
                            patchItem(i.id, { hinweis: cleaned });
                          }
                        }}
                      />
                    )}
                  </td>
                  <td
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(i.important_note)}
                      disabled={replaced}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (replaced) return;
                        if (e.target.checked && !String(i.hinweis || "").trim()) {
                          alert("Bitte zuerst einen Hinweis eintragen.");
                          return;
                        }
                        // Nur important_note – keine Sortierung, kein Hinweis-Rewrite
                        updateItem(i.id, { important_note: e.target.checked });
                      }}
                      title="Wichtiger Hinweis"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => deleteItem(i.id)}
                      disabled={deleteLocked}
                      title={
                        replaced
                          ? "Ersetzte Position kann nicht gelöscht werden"
                          : deleteLocked
                          ? REPLACEMENT_TARGET_LOCKED_DELETE_MESSAGE
                          : undefined
                      }
                    >
                      ×
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
