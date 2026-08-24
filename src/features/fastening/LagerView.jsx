import { useState } from "react";
import { groupBy, projectStatus } from "../../utils/helpers";
import { parseEinbauort, isBaugruppeRow } from "../../utils/structure";
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
import { articleIdentityKey, collectUniqueHinweise } from "./fasteningRules";
import { isActiveItem, isReplacedItem, formatReplacedHint } from "./replacement";
import SearchField from "../../components/SearchField";
import CompletionCheckbox from "../../components/CompletionCheckbox";
import LagerReplacePanel from "./LagerReplacePanel";

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
  const [replacingRow, setReplacingRow] = useState(null);
  // Rein lokale UI-Markierung "zuletzt geändert" (kein Undo, keine
  // Datenbankhistorie, kein Persistieren über Neuladen hinaus) - hilft nur,
  // eine versehentlich geänderte Lagerzeile sofort wiederzufinden.
  const [lastChangedKey, setLastChangedKey] = useState(null);
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);

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

  async function handleReplace(source, newFields) {
    await replaceItem(source.id, newFields);
  }

  // Unberührte Position (Sprint 2C, GPT-Review Punkt 3): direkte Änderung
  // ohne Historie, exakt dieselbe zentrale Entscheidung wie in TB.
  async function handleDirectUpdate(itemId, patch) {
    await updateItem(itemId, patch);
  }

  const bgRow = baugruppe
    ? (structureRows || []).find(
        (r) =>
          String(r.project_id) === String(project.id) &&
          r.baugruppe === baugruppe &&
          isBaugruppeRow(r)
      )
    : null;
  const lagerDone = Boolean(bgRow?.lager_abgeschlossen);

  // Meldet zurück, ob WIRKLICH alle zur Aktion gehörenden Updates gespeichert
  // wurden (updateItem liefert jetzt true/false statt nur intern zu alerten) -
  // nötig, damit die "zuletzt geändert"-Markierung niemals bei einem
  // fehlgeschlagenen Speichern gesetzt wird.
  async function applyGelegt(rowItems, value) {
    const results = await Promise.all(
      distribute(rowItems, value).map((u) => updateItem(u.id, { bereit: u.bereit }))
    );
    return results.every(Boolean);
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
      {baugruppe && setBaugruppeCompletion && (
        <CompletionCheckbox
          label={`Lagerprüfung abgeschlossen${baugruppe ? ` · ${baugruppe}` : ""}`}
          checked={lagerDone}
          onToggle={(next) =>
            setBaugruppeCompletion(project.id, baugruppe, "lager_abgeschlossen", next)
          }
          confirmMessage="Lagerprüfung für dieses Projekt wirklich als abgeschlossen markieren?"
        />
      )}
      <SearchField value={search} onChange={setSearch} />
      {sortedRows.length === 0 && <p>Keine Materialpositionen in diesem Projekt.</p>}
      {sortedRows.length > 0 && (
        <div className="tableWrap">
          <table>
            <tbody>
              <tr>
                <th className="sortableTh" onClick={() => toggleSort("regal")}>
                  Regalfach{arrow("regal")}
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
                <th className="sortableTh" onClick={() => toggleSort("menge")}>
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
                const rowClass = [
                  row.vollstaendig ? "rowDone" : null,
                  isLastChanged ? "lastChangedRow" : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined;
                return (
                  <tr key={row.key} className={rowClass} title={isLastChanged ? "Zuletzt geändert" : undefined}>
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
                          onClick={() => setReplacingRow(row)}
                        >
                          Ersetzen
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {replacingRow && (
        <LagerReplacePanel
          row={replacingRow}
          onClose={() => setReplacingRow(null)}
          onReplace={handleReplace}
          onDirectUpdate={handleDirectUpdate}
        />
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
