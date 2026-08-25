import { Fragment, useState } from "react";
import { groupBy, projectStatus, allUpdatesSucceeded } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";
import { naturalCompare, useSortableColumns, compareWithSizeSecondary } from "../../utils/sorting";
import { filterBySearch, sizeLengthSearchParts } from "../../utils/textSearch";
import { regalOrderIndex, getRegalPlatz } from "./regalOrder";
import { distribute, readManualValues, writeManualValues } from "./stock";
import {
  buildHerkunftProject,
  herkunftSearchParts,
  herkunftSortKey,
  herkunftVisibleParts,
} from "./herkunft";
import { ausfuehrungen, groessen } from "./constants";
import { getDescriptionOptions, rememberDescriptionIfNew } from "./descriptionsRegistry";
import { articleIdentityKey, collectUniqueHinweise, dedupeHinweisText } from "./fasteningRules";
import { isActiveItem, isReplacedItem, formatReplacedHint } from "./replacement";
import { useItemEditor } from "./useItemEditor";
import SearchField from "../../components/SearchField";
import BaugruppeCompletionSection from "../../components/BaugruppeCompletionSection";
import SuggestionAutocomplete from "./SuggestionAutocomplete";

function defaultSort(rows) {
  return [...rows].sort((a, b) => {
    const fachDiff = regalOrderIndex(a) - regalOrderIndex(b);
    if (fachDiff !== 0) return fachDiff;
    return (
      naturalCompare(a.bezeichnung, b.bezeichnung) ||
      naturalCompare(a.groesse, b.groesse) ||
      naturalCompare(a.laenge, b.laenge)
    );
  });
}

function compareByColumn(a, b, key) {
  if (key === "regal") return regalOrderIndex(a) - regalOrderIndex(b);
  if (key === "menge" || key === "rest" || key === "gelegt") {
    return (Number(a[key]) || 0) - (Number(b[key]) || 0);
  }
  if (key === "herkunft") return naturalCompare(a.herkunftSortKey, b.herkunftSortKey);
  return naturalCompare(a[key], b[key]);
}

function sortLagerRows(rows, sortKey, sortDir) {
  const sorted = sortKey
    ? [...rows].sort((a, b) =>
        compareWithSizeSecondary(a, b, {
          sortKey,
          sortDir,
          compareColumn: compareByColumn,
          tieBreak: (x, y) => naturalCompare(x.key, y.key),
        })
      )
    : defaultSort(rows);
  const open = sorted.filter((r) => !r.vollstaendig);
  const done = sorted.filter((r) => r.vollstaendig);
  return [...open, ...done];
}

const EDIT_COLSPAN = 10;

export default function LagerView({
  items,
  updateItem,
  replaceItem,
  hasFullModuleAccess,
  project,
  structureRows,
  baugruppe,
  setBaugruppeCompletion,
}) {
  const [manualValues, setManualValues] = useState(readManualValues);
  const [search, setSearch] = useState("");
  // Rein lokale UI-Markierung "zuletzt geändert" (kein Undo, keine
  // Datenbankhistorie, kein Persistieren über Neuladen hinaus) - hilft nur,
  // eine versehentlich geänderte Lagerzeile sofort wiederzufinden.
  const [lastChangedKey, setLastChangedKey] = useState(null);
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);
  const descriptionOptions = getDescriptionOptions();

  // Direktbearbeitung im Lager (Sprint: Lager-Direktbearbeitung) - dieselbe
  // zentrale Entscheidung wie in TB (useItemEditor), keine zweite
  // Lager-Sonderlogik. `items` ist hier projektweit, da eine Lagerzeile
  // Positionen unterschiedlicher Bauteile zusammenfassen kann.
  const editor = useItemEditor({ items, updateItem, replaceItem });
  // Welche aggregierte Zeile gerade bearbeitet wird, und - bei mehreren
  // zusammengefassten Ursprungspositionen - welche davon konkret gewählt
  // wurde. Bei genau einer Ursprungsposition sofort eindeutig.
  const [editingKey, setEditingKey] = useState(null);
  const [editingSourceId, setEditingSourceId] = useState(null);

  function startEdit(row) {
    setEditingKey(row.key);
    setEditingSourceId(row.items.length === 1 ? row.items[0].id : null);
  }

  function stopEdit() {
    setEditingKey(null);
    setEditingSourceId(null);
    editor.cancelReplace();
    editor.cancelMengeReset();
  }

  const enriched = items.map((i) => {
    const parsed = parseEinbauort(i.einbauort, project?.baugruppe);
    return { ...i, ...parsed };
  });

  // Ersetzte Altpositionen dürfen nicht mehr mit dem aktiven Bedarf
  // desselben Artikels zusammenaggregiert werden (Sprint 2B) - sonst wäre
  // aktueller Bedarf und ersetzte Historie über articleIdentityKey wieder
  // ununterscheidbar zusammengefasst.
  const activeEnriched = enriched.filter(isActiveItem);
  const replacedEnriched = enriched.filter(isReplacedItem);
  const itemsById = new Map(items.map((i) => [i.id, i]));

  const combos = groupBy(activeEnriched, articleIdentityKey);
  const rows = Object.values(combos).map((arr) => {
    const first = arr[0];
    const menge = arr.reduce((s, i) => s + Number(i.menge || 0), 0);
    const gelegt = arr.reduce((s, i) => s + Number(i.bereit || 0), 0);
    const rest = Math.max(0, menge - gelegt);
    const vollstaendig = menge > 0 && rest === 0;
    const herkunft = buildHerkunftProject(arr);
    return {
      key: `${project.id}|${articleIdentityKey(first)}`,
      bezeichnung: first.bezeichnung,
      groesse: first.groesse,
      laenge: first.laenge,
      oberflaeche: first.oberflaeche,
      menge,
      gelegt,
      rest,
      vollstaendig,
      herkunft,
      herkunftSortKey: herkunftSortKey(herkunft),
      items: arr,
    };
  });

  const filteredRows = filterBySearch(rows, search, (row) => [
    project?.nr,
    project?.name,
    row.bezeichnung,
    row.groesse,
    row.laenge,
    row.oberflaeche,
    getRegalPlatz(row),
    ...herkunftSearchParts(row.herkunft, row.items).filter(
      (p) => String(p || "").toLowerCase() !== "automatisch ergänzt"
    ),
    ...collectUniqueHinweise(row.items).map((h) => h.text),
    ...sizeLengthSearchParts(row.groesse, row.laenge),
  ]);
  const sortedRows = sortLagerRows(filteredRows, sortKey, sortDir);
  const status = projectStatus(project, items);

  // Ersetzte Altpositionen (Sprint 2B): real vorbereitete/bestellte Ware
  // bleibt einzeln (nicht aggregiert) nachvollziehbar, zählt aber nicht mehr
  // als offener Restbedarf und fließt nicht in die Statusampel ein.
  const replacedRows = filterBySearch(replacedEnriched, search, (i) => [
    project?.nr,
    project?.name,
    i.bezeichnung,
    i.groesse,
    i.laenge,
    i.oberflaeche,
    i.baugruppe,
    i.bauteil,
    i.pos,
    ...sizeLengthSearchParts(i.groesse, i.laenge),
  ]).sort((a, b) => naturalCompare(a.bezeichnung, b.bezeichnung) || naturalCompare(a.groesse, b.groesse));

  function replacedByLabel(item) {
    const newItem = itemsById.get(item.ersetzt_durch);
    if (!newItem) return formatReplacedHint(null);
    const parsedNew = parseEinbauort(newItem.einbauort, project?.baugruppe);
    return formatReplacedHint(newItem, parsedNew.bauteil);
  }

  // Meldet zurück, ob WIRKLICH alle zur Aktion gehörenden Updates gespeichert
  // wurden (updateItem liefert jetzt true/false statt nur intern zu alerten) -
  // nötig, damit die "zuletzt geändert"-Markierung niemals bei einem
  // fehlgeschlagenen Speichern gesetzt wird.
  async function applyGelegt(rowItems, value) {
    const results = await Promise.all(
      distribute(rowItems, value).map((u) => updateItem(u.id, { bereit: u.bereit }))
    );
    return allUpdatesSucceeded(results);
  }

  function rememberManualValue(rowKey, value) {
    setManualValues((prev) => {
      const next = { ...prev, [rowKey]: value };
      writeManualValues(next);
      return next;
    });
  }

  async function handleManualChange(row, value) {
    const v = Number(value) || 0;
    rememberManualValue(row.key, v);
    const ok = await applyGelegt(row.items, v);
    if (ok) setLastChangedKey(row.key);
  }

  async function handleCompleteToggle(row, checked) {
    let ok;
    if (checked) {
      rememberManualValue(row.key, row.gelegt);
      ok = await applyGelegt(row.items, row.menge);
    } else {
      ok = await applyGelegt(row.items, manualValues[row.key] || 0);
    }
    if (ok) setLastChangedKey(row.key);
  }

  return (
    <div className="card">
      <h2>
        Lager
        <span className="statusPill" title={status.label}>
          {" "}
          {status.cls === "green" ? "🟢" : status.cls === "yellow" ? "🟡" : "🔴"} {status.label}
        </span>
      </h2>
      <p className="hint">
        Projektweite Zusammenfassung identischer Artikel. Standard: Reihenfolge im Paternoster.
        Restmenge = Gesamtmenge − Vorhanden.
      </p>
      <BaugruppeCompletionSection
        project={project}
        baugruppe={baugruppe}
        structureRows={structureRows}
        field="lager_abgeschlossen"
        labelPrefix="Lagerprüfung abgeschlossen"
        confirmText={(bg) => `Lagerprüfung für „${bg}“ wirklich als abgeschlossen markieren?`}
        setBaugruppeCompletion={setBaugruppeCompletion}
      />
      <SearchField value={search} onChange={setSearch} />
      {editor.pendingReplace && (
        <div className="completionConfirm replaceConfirm">
          <div>
            <p>
              Diese Position wurde bereits{" "}
              {editor.pendingReplace.current.bereit > 0 && editor.pendingReplace.current.bestellt
                ? "vorbereitet und bestellt"
                : editor.pendingReplace.current.bereit > 0
                ? "vorbereitet"
                : "bestellt"}
              .
            </p>
            {editor.pendingReplace.current.bereit > 0 && (
              <p>
                {editor.pendingReplace.current.bereit} × {editor.pendingReplace.current.bezeichnung}{" "}
                {editor.pendingReplace.current.groesse}
                {editor.pendingReplace.current.laenge ? `×${editor.pendingReplace.current.laenge}` : ""}{" "}
                bleiben als vorbereitete Altposition erhalten.
              </p>
            )}
            <p>
              Die neue Position{" "}
              {editor.pendingReplace.newFields.bezeichnung ?? editor.pendingReplace.current.bezeichnung}{" "}
              {editor.pendingReplace.newFields.groesse ?? editor.pendingReplace.current.groesse}
              {(editor.pendingReplace.newFields.laenge ?? editor.pendingReplace.current.laenge)
                ? `×${editor.pendingReplace.newFields.laenge ?? editor.pendingReplace.current.laenge}`
                : ""}{" "}
              startet im Lager mit 0.
            </p>
            {editor.pendingReplace.current.bestellt && (
              <p className="dangerText">
                Diese Position wurde bereits bestellt. Bestellung ggf. manuell stornieren oder
                korrigieren.
              </p>
            )}
            <p>Position wirklich ersetzen?</p>
          </div>
          <div className="completionConfirmButtons">
            <button type="button" className="ghost" onClick={editor.cancelReplace}>
              Abbrechen
            </button>
            <button type="button" onClick={editor.confirmReplace}>
              Ersetzen
            </button>
          </div>
        </div>
      )}
      {editor.pendingMengeReset && (
        <div className="completionConfirm replaceConfirm">
          <div>
            <p>
              Die benötigte Menge wurde erhöht. Der bisherige Bestellstatus deckt die
              zusätzliche Menge möglicherweise nicht ab.
            </p>
            <p>Menge übernehmen und Bestellstatus zurücksetzen?</p>
          </div>
          <div className="completionConfirmButtons">
            <button type="button" className="ghost" onClick={editor.cancelMengeReset}>
              Abbrechen
            </button>
            <button type="button" onClick={editor.confirmMengeReset}>
              Bestätigen
            </button>
          </div>
        </div>
      )}
      {sortedRows.length === 0 && <p>Keine Materialpositionen in diesem Projekt.</p>}
      {sortedRows.length > 0 && (
        <div className="tableWrap">
          <table className="lagerTable">
            <tbody>
              <tr>
                <th className="sortableTh colRegal" onClick={() => toggleSort("regal")}>
                  Regalfach{arrow("regal")}
                </th>
                <th className="sortableTh colBez" onClick={() => toggleSort("bezeichnung")}>
                  Bezeichnung{arrow("bezeichnung")}
                </th>
                <th className="sortableTh colGr" onClick={() => toggleSort("groesse")}>
                  Größe{arrow("groesse")}
                </th>
                <th className="sortableTh colLa" onClick={() => toggleSort("laenge")}>
                  Länge{arrow("laenge")}
                </th>
                <th className="sortableTh colAus" onClick={() => toggleSort("oberflaeche")}>
                  Ausführung{arrow("oberflaeche")}
                </th>
                <th className="sortableTh colMenge" onClick={() => toggleSort("menge")}>
                  Gesamtmenge{arrow("menge")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("gelegt")}>
                  Vorhanden{arrow("gelegt")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("rest")}>
                  Restmenge{arrow("rest")}
                </th>
                <th className="sortableTh colHerkunft" onClick={() => toggleSort("herkunft")}>
                  Herkunft{arrow("herkunft")}
                </th>
                {hasFullModuleAccess && <th></th>}
              </tr>
              {sortedRows.map((row) => {
                const vis = herkunftVisibleParts(row.herkunft, search);
                const isLastChanged = row.key === lastChangedKey;
                const isEditing = editingKey === row.key;
                const rowClass = [
                  row.vollstaendig ? "rowDone" : null,
                  isLastChanged ? "lastChangedRow" : null,
                  isEditing ? "editingRow" : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined;
                const source = isEditing
                  ? row.items.find((i) => i.id === editingSourceId) || null
                  : null;
                return (
                  <Fragment key={row.key}>
                    <tr className={rowClass} title={isLastChanged ? "Zuletzt geändert" : undefined}>
                      <td>{getRegalPlatz(row)}</td>
                      <td>{row.bezeichnung}</td>
                      <td>{row.groesse}</td>
                      <td>{row.laenge}</td>
                      <td>{row.oberflaeche}</td>
                      <td>{row.menge}</td>
                      <td>
                        <div className="lagerVorhanden">
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={row.gelegt}
                            disabled={row.vollstaendig}
                            onChange={(e) => handleManualChange(row, e.target.value)}
                          />
                          <label className="checkboxLine">
                            <input
                              type="checkbox"
                              checked={row.vollstaendig}
                              onChange={(e) => handleCompleteToggle(row, e.target.checked)}
                            />
                            Vollständig
                          </label>
                        </div>
                      </td>
                      <td>
                        <span className={"badge " + (row.rest > 0 ? "red" : "green")}>{row.rest}</span>
                      </td>
                      <td className="colHerkunft">
                        <div className="herkunftCell">
                          <div className="herkunftNames">{vis.names.join(", ") || "–"}</div>
                          {vis.showPos && vis.posList.length > 0 && (
                            <div className="hint herkunftPos">Pos. {vis.posList.join(", ")}</div>
                          )}
                          {collectUniqueHinweise(row.items).map((h) => (
                            <div
                              key={h.text}
                              className={h.important_note ? "importantNote" : "hint"}
                            >
                              {h.text}
                            </div>
                          ))}
                        </div>
                      </td>
                      {hasFullModuleAccess && (
                        <td>
                          <button
                            type="button"
                            className="ghost lagerReplaceBtn"
                            onClick={() => (isEditing ? stopEdit() : startEdit(row))}
                          >
                            {isEditing ? "Fertig" : "Bearbeiten"}
                          </button>
                        </td>
                      )}
                    </tr>
                    {isEditing && (
                      <tr className="lagerEditRow">
                        <td colSpan={EDIT_COLSPAN}>
                          {!source ? (
                            <div className="lagerEditForm">
                              <p className="hint">
                                Diese Lagerzeile fasst mehrere Ursprungspositionen zusammen. Bitte
                                genau eine auswählen - eine Änderung darf nie alle gleichzeitig
                                betreffen.
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
                                    {row.items.map((i) => (
                                      <tr key={i.id}>
                                        <td>{i.baugruppe}</td>
                                        <td>{i.bauteil}</td>
                                        <td>{i.pos}</td>
                                        <td>{i.menge}</td>
                                        <td>{i.bereit || 0}</td>
                                        <td>{i.bestellt ? "Ja" : "Nein"}</td>
                                        <td>
                                          <button
                                            type="button"
                                            onClick={() => setEditingSourceId(i.id)}
                                          >
                                            Auswählen
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="lagerEditForm">
                              {row.items.length > 1 && (
                                <p className="hint">
                                  Ursprung: {source.baugruppe} · {source.bauteil} · Pos.{" "}
                                  {source.pos}{" "}
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => setEditingSourceId(null)}
                                  >
                                    Andere Position wählen
                                  </button>
                                </p>
                              )}
                              <div className="entryGrid">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="Menge"
                                  value={editor.fieldDisplayValue(source, "menge")}
                                  onChange={(e) =>
                                    editor.handleFieldChange(source, "menge", Number(e.target.value))
                                  }
                                />
                                <SuggestionAutocomplete
                                  value={editor.fieldDisplayValue(source, "bezeichnung")}
                                  onChange={(v) => editor.handleFieldChange(source, "bezeichnung", v)}
                                  onCommit={(v) => {
                                    rememberDescriptionIfNew(v);
                                    editor.commitFieldDraft(source, "bezeichnung");
                                  }}
                                  options={descriptionOptions}
                                  placeholder="Bezeichnung"
                                />
                                <input
                                  placeholder="Größe"
                                  value={editor.fieldDisplayValue(source, "groesse")}
                                  onChange={(e) =>
                                    editor.handleFieldChange(source, "groesse", e.target.value)
                                  }
                                  onBlur={() => editor.commitFieldDraft(source, "groesse")}
                                />
                                <input
                                  placeholder="Länge"
                                  value={editor.fieldDisplayValue(source, "laenge")}
                                  onChange={(e) =>
                                    editor.handleFieldChange(source, "laenge", e.target.value)
                                  }
                                  onBlur={() => editor.commitFieldDraft(source, "laenge")}
                                />
                                <SuggestionAutocomplete
                                  value={editor.fieldDisplayValue(source, "oberflaeche")}
                                  onChange={(v) => editor.handleFieldChange(source, "oberflaeche", v)}
                                  onCommit={() => editor.commitFieldDraft(source, "oberflaeche")}
                                  options={ausfuehrungen}
                                  placeholder="Ausführung"
                                />
                                <input
                                  placeholder="Hinweis"
                                  value={editor.fieldDisplayValue(source, "hinweis")}
                                  onChange={(e) =>
                                    editor.handleFieldChange(source, "hinweis", e.target.value)
                                  }
                                  onBlur={(e) => {
                                    const cleaned = dedupeHinweisText(e.target.value);
                                    if (cleaned !== String(source.hinweis || "")) {
                                      editor.patchItem(source.id, { hinweis: cleaned });
                                    }
                                  }}
                                />
                                <label
                                  className="checkboxLine entryImportantNote"
                                  title="Wichtiger Hinweis"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(source.important_note)}
                                    onChange={(e) => {
                                      if (
                                        e.target.checked &&
                                        !String(source.hinweis || "").trim()
                                      ) {
                                        alert("Bitte zuerst einen Hinweis eintragen.");
                                        return;
                                      }
                                      updateItem(source.id, { important_note: e.target.checked });
                                    }}
                                  />
                                  Wichtig
                                </label>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {replacedRows.length > 0 && (
        <div className="replacedHistorySection">
          <h3>Ersetzte Altpositionen</h3>
          <p className="hint">
            Bereits vorbereitete/bestellte Ware bleibt hier nachvollziehbar, zählt aber nicht mehr
            als aktueller Bedarf.
          </p>
          <div className="tableWrap">
            <table>
              <tbody>
                <tr>
                  <th>Bezeichnung</th>
                  <th>Größe</th>
                  <th>Länge</th>
                  <th>Ausführung</th>
                  <th>Vorhanden</th>
                  <th>Bestellt</th>
                  <th>Herkunft</th>
                  <th></th>
                </tr>
                {replacedRows.map((i) => (
                  <tr key={i.id} className="replacedRow">
                    <td>{i.bezeichnung}</td>
                    <td>{i.groesse}</td>
                    <td>{i.laenge}</td>
                    <td>{i.oberflaeche}</td>
                    <td>{i.bereit || 0}</td>
                    <td>{i.bestellt ? "Ja" : "Nein"}</td>
                    <td>
                      {i.baugruppe} · {i.bauteil} · Pos. {i.pos}
                    </td>
                    <td className="replacedFieldText">{replacedByLabel(i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
