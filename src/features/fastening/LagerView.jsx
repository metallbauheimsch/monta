import { useState } from "react";
import { groupBy, projectStatus } from "../../utils/helpers";
import { parseEinbauort, isBaugruppeRow } from "../../utils/structure";
import { naturalCompare, useSortableColumns } from "../../utils/sorting";
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
import SearchField from "../../components/SearchField";
import CompletionCheckbox from "../../components/CompletionCheckbox";

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
    ? [...rows].sort((a, b) => (sortDir === "desc" ? -1 : 1) * compareByColumn(a, b, sortKey))
    : defaultSort(rows);
  const open = sorted.filter((r) => !r.vollstaendig);
  const done = sorted.filter((r) => r.vollstaendig);
  return [...open, ...done];
}

export default function LagerView({
  items,
  updateItem,
  project,
  structureRows,
  baugruppe,
  setBaugruppeCompletion,
}) {
  const [manualValues, setManualValues] = useState(readManualValues);
  const [search, setSearch] = useState("");
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);

  const enriched = items.map((i) => {
    const parsed = parseEinbauort(i.einbauort, project?.baugruppe);
    return { ...i, ...parsed };
  });

  const combos = groupBy(enriched, articleIdentityKey);
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

  const bgRow = baugruppe
    ? (structureRows || []).find(
        (r) =>
          String(r.project_id) === String(project.id) &&
          r.baugruppe === baugruppe &&
          isBaugruppeRow(r)
      )
    : null;
  const lagerDone = Boolean(bgRow?.lager_abgeschlossen);

  function applyGelegt(rowItems, value) {
    distribute(rowItems, value).forEach((u) => updateItem(u.id, { bereit: u.bereit }));
  }

  function rememberManualValue(rowKey, value) {
    setManualValues((prev) => {
      const next = { ...prev, [rowKey]: value };
      writeManualValues(next);
      return next;
    });
  }

  function handleManualChange(row, value) {
    const v = Number(value) || 0;
    rememberManualValue(row.key, v);
    applyGelegt(row.items, v);
  }

  function handleCompleteToggle(row, checked) {
    if (checked) {
      rememberManualValue(row.key, row.gelegt);
      applyGelegt(row.items, row.menge);
    } else {
      applyGelegt(row.items, manualValues[row.key] || 0);
    }
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
          confirmMessage="Lagerprüfung für diese Baugruppe als abgeschlossen markieren?"
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
              </tr>
              {sortedRows.map((row) => {
                const vis = herkunftVisibleParts(row.herkunft, search);
                return (
                  <tr key={row.key} className={row.vollstaendig ? "rowDone" : undefined}>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
