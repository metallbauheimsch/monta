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
import { resolveBulkPatch, hasMixedHinweis, affectedBauteilCount } from "./lagerBulkEdit";
import SearchField from "../../components/SearchField";
import ProjectCompletionSection from "../../components/ProjectCompletionSection";
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

const EDIT_COLSPAN = 9;

export default function LagerView({
  items,
  updateItem,
  replaceItemsBulk,
  hasFullModuleAccess,
  project,
  setProjectCompletion,
}) {
  const [manualValues, setManualValues] = useState(readManualValues);
  const [search, setSearch] = useState("");
  // Rein lokale UI-Markierung "zuletzt geändert" (kein Undo, keine
  // Datenbankhistorie, kein Persistieren über Neuladen hinaus) - hilft nur,
  // eine versehentlich geänderte Lagerzeile sofort wiederzufinden.
  const [lastChangedKey, setLastChangedKey] = useState(null);
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);
  const descriptionOptions = getDescriptionOptions();

  // Lager-Gesamtänderung (Praxis-Sprint): eine Änderung an einer
  // aggregierten Lagerzeile gilt für ALLE zusammengefassten
  // Ursprungspositionen - kein separates "Bearbeiten"-Panel, keine
  // Ursprungsauswahl mehr. Die fachliche Entscheidung je Position
  // (direkt ändern vs. ersetzen) kommt zentral aus lagerBulkEdit.js /
  // replacement.js - keine zweite, abweichende Lagerlogik. Einzelne,
  // gezielte Änderung EINER Ursprungsposition bleibt weiterhin über TB
  // möglich.
  const [editingKey, setEditingKey] = useState(null);
  const [rowDraft, setRowDraft] = useState({});
  const [pendingBulkEdit, setPendingBulkEdit] = useState(null);
  const [bulkEditBusy, setBulkEditBusy] = useState(false);

  function startEdit(row) {
    setEditingKey(row.key);
    setRowDraft({});
    setPendingBulkEdit(null);
  }

  function stopEdit() {
    setEditingKey(null);
    setRowDraft({});
    setPendingBulkEdit(null);
  }

  function fieldDisplayValue(row, key) {
    if (rowDraft[key] !== undefined) return rowDraft[key];
    if (key === "hinweis") {
      return hasMixedHinweis(row.items) ? "" : String(row.items[0]?.hinweis || "");
    }
    return row[key] || "";
  }

  function handleFieldChange(key, value) {
    setRowDraft((prev) => ({ ...prev, [key]: value }));
  }

  function openBulkConfirm(row, rawPatch) {
    if (!Object.keys(rawPatch).length) return;
    const mixedHinweisOverwrite = rawPatch.hinweis !== undefined && hasMixedHinweis(row.items);
    const { directUpdates, replacements, warnings } = resolveBulkPatch(row.items, rawPatch);
    setPendingBulkEdit({ row, directUpdates, replacements, warnings, mixedHinweisOverwrite });
  }

  function commitDraft(row) {
    const rawPatch = { ...rowDraft };
    setRowDraft({});
    openBulkConfirm(row, rawPatch);
  }

  function handleImportantNoteChange(row, checked) {
    const draftHinweis = rowDraft.hinweis;
    const hasAnyHinweis =
      draftHinweis !== undefined
        ? String(draftHinweis).trim()
        : row.items.some((i) => String(i.hinweis || "").trim());
    if (checked && !hasAnyHinweis) {
      alert("Bitte zuerst einen Hinweis eintragen.");
      return;
    }
    const rawPatch = { ...rowDraft, important_note: checked };
    setRowDraft({});
    openBulkConfirm(row, rawPatch);
  }

  function cancelBulkEdit() {
    setPendingBulkEdit(null);
  }

  async function confirmBulkEdit() {
    if (!pendingBulkEdit || bulkEditBusy) return;
    setBulkEditBusy(true);
    try {
      await replaceItemsBulk({
        replacements: pendingBulkEdit.replacements,
        directUpdates: pendingBulkEdit.directUpdates,
      });
      setLastChangedKey(pendingBulkEdit.row.key);
      setPendingBulkEdit(null);
    } catch {
      setPendingBulkEdit(null);
    } finally {
      setBulkEditBusy(false);
    }
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
      <ProjectCompletionSection
        project={project}
        field="lager_abgeschlossen"
        label="Lagerprüfung abgeschlossen"
        confirmMessage="Lagerprüfung für das gesamte Projekt wirklich als abgeschlossen markieren?"
        setProjectCompletion={setProjectCompletion}
      />
      <SearchField value={search} onChange={setSearch} />
      {pendingBulkEdit && (
        <div className="completionConfirm replaceConfirm">
          <div>
            <p>
              Diese Änderung gilt für alle {pendingBulkEdit.row.items.length} Position
              {pendingBulkEdit.row.items.length === 1 ? "" : "en"} dieser Lagerzeile (
              {affectedBauteilCount(pendingBulkEdit.row.items)} Bauteil
              {affectedBauteilCount(pendingBulkEdit.row.items) === 1 ? "" : "e"}, Gesamtmenge{" "}
              {pendingBulkEdit.row.menge}).
            </p>
            {pendingBulkEdit.replacements.length > 0 && (
              <>
                <p>
                  {pendingBulkEdit.replacements.length} davon{" "}
                  {pendingBulkEdit.replacements.length === 1 ? "ist" : "sind"} bereits vorbereitet
                  oder bestellt - diese werden durch eine neue Position ersetzt, die bisherige
                  Menge bleibt als vorbereitete/bestellte Altposition unverändert erhalten:
                </p>
                <ul>
                  {pendingBulkEdit.replacements.map((r) => (
                    <li key={r.source.id}>
                      {r.source.bauteil} · Pos. {r.source.pos}
                      {r.source.bereit > 0 ? ` · ${r.source.bereit} vorbereitet` : ""}
                      {r.source.bestellt ? " · bestellt" : ""}
                    </li>
                  ))}
                </ul>
                {pendingBulkEdit.replacements.some((r) => r.source.bestellt) && (
                  <p className="dangerText">
                    Mindestens eine bereits bestellte Position ist betroffen. Bestellung ggf.
                    manuell stornieren oder korrigieren.
                  </p>
                )}
              </>
            )}
            {pendingBulkEdit.mixedHinweisOverwrite && (
              <p className="dangerText">
                Die Positionen dieser Zeile hatten bisher unterschiedliche Hinweistexte - der neue
                Text ersetzt alle.
              </p>
            )}
            {pendingBulkEdit.warnings.map((w) => (
              <p key={w} className="hint">
                {w}
              </p>
            ))}
            <p>Änderung wirklich für die gesamte Lagerzeile übernehmen?</p>
          </div>
          <div className="completionConfirmButtons">
            <button type="button" className="ghost" onClick={cancelBulkEdit} disabled={bulkEditBusy}>
              Abbrechen
            </button>
            <button type="button" onClick={confirmBulkEdit} disabled={bulkEditBusy}>
              Übernehmen
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
                const editableCell = hasFullModuleAccess ? "lagerEditableCell" : undefined;
                const openEdit = () => (isEditing ? undefined : startEdit(row));
                return (
                  <Fragment key={row.key}>
                    <tr className={rowClass} title={isLastChanged ? "Zuletzt geändert" : undefined}>
                      <td>{getRegalPlatz(row)}</td>
                      <td className={editableCell} onClick={hasFullModuleAccess ? openEdit : undefined}>
                        {row.bezeichnung}
                      </td>
                      <td className={editableCell} onClick={hasFullModuleAccess ? openEdit : undefined}>
                        {row.groesse}
                      </td>
                      <td className={editableCell} onClick={hasFullModuleAccess ? openEdit : undefined}>
                        {row.laenge}
                      </td>
                      <td className={editableCell} onClick={hasFullModuleAccess ? openEdit : undefined}>
                        {row.oberflaeche}
                      </td>
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
                      <td
                        className={"colHerkunft" + (editableCell ? " " + editableCell : "")}
                        onClick={hasFullModuleAccess ? openEdit : undefined}
                      >
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
                    </tr>
                    {isEditing && (
                      <tr className="lagerEditRow">
                        <td colSpan={EDIT_COLSPAN}>
                          <div className="lagerEditForm">
                            <p className="hint">
                              {row.items.length > 1
                                ? `Änderung gilt für alle ${row.items.length} zusammengefassten Ursprungspositionen dieser Zeile. Einzeländerung einer einzelnen Position: über TB.`
                                : "Änderung gilt für diese Position."}{" "}
                              <button type="button" className="ghost" onClick={stopEdit}>
                                Schließen
                              </button>
                            </p>
                            <div className="entryGrid">
                              <SuggestionAutocomplete
                                value={fieldDisplayValue(row, "bezeichnung")}
                                onChange={(v) => handleFieldChange("bezeichnung", v)}
                                onCommit={(v) => {
                                  rememberDescriptionIfNew(v);
                                  commitDraft(row);
                                }}
                                options={descriptionOptions}
                                placeholder="Bezeichnung"
                              />
                              <input
                                placeholder="Größe"
                                value={fieldDisplayValue(row, "groesse")}
                                onChange={(e) => handleFieldChange("groesse", e.target.value)}
                                onBlur={() => commitDraft(row)}
                              />
                              <input
                                placeholder="Länge"
                                value={fieldDisplayValue(row, "laenge")}
                                onChange={(e) => handleFieldChange("laenge", e.target.value)}
                                onBlur={() => commitDraft(row)}
                              />
                              <SuggestionAutocomplete
                                value={fieldDisplayValue(row, "oberflaeche")}
                                onChange={(v) => handleFieldChange("oberflaeche", v)}
                                onCommit={() => commitDraft(row)}
                                options={ausfuehrungen}
                                placeholder="Ausführung"
                              />
                              <input
                                placeholder={
                                  hasMixedHinweis(row.items) && rowDraft.hinweis === undefined
                                    ? "Mehrere unterschiedliche Hinweise – neuer Text ersetzt alle"
                                    : "Hinweis"
                                }
                                value={fieldDisplayValue(row, "hinweis")}
                                onChange={(e) =>
                                  handleFieldChange("hinweis", dedupeHinweisText(e.target.value))
                                }
                                onBlur={() => commitDraft(row)}
                              />
                              <label
                                className="checkboxLine entryImportantNote"
                                title="Wichtiger Hinweis"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    rowDraft.important_note !== undefined
                                      ? rowDraft.important_note
                                      : row.items.every((i) => i.important_note)
                                  }
                                  onChange={(e) => handleImportantNoteChange(row, e.target.checked)}
                                />
                                Wichtig
                              </label>
                            </div>
                          </div>
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
