import { useState } from "react";
import { groupBy, baugruppeStatus, projectStatus } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";
import { naturalCompare, useSortableColumns } from "../../utils/sorting";
import { filterBySearch, sizeLengthSearchParts } from "../../utils/textSearch";
import { distribute, readManualValues, writeManualValues } from "./stock";
import {
  buildHerkunftProject,
  herkunftSearchParts,
  herkunftVisibleParts,
} from "./herkunft";
import { articleIdentityKey, collectUniqueHinweise } from "./fasteningRules";
import { prepareAndOpenMailRequest } from "../../utils/mailRequest";
import SearchField from "../../components/SearchField";

function comboKey(item) {
  return [item.bezeichnung, item.groesse, item.laenge, item.oberflaeche].join("|");
}

function defaultSort(rows) {
  return [...rows].sort(
    (a, b) =>
      naturalCompare(a.bezeichnung, b.bezeichnung) ||
      naturalCompare(a.groesse, b.groesse) ||
      naturalCompare(a.laenge, b.laenge)
  );
}

function compareByColumn(a, b, key) {
  if (key === "fehlmenge" || key === "geliefert") return (Number(a[key]) || 0) - (Number(b[key]) || 0);
  if (key === "bestellt") return Number(a.bestellt) - Number(b.bestellt);
  return naturalCompare(a[key], b[key]);
}

function sortCartRows(rows, sortKey, sortDir) {
  const sorted = sortKey
    ? [...rows].sort((a, b) => (sortDir === "desc" ? -1 : 1) * compareByColumn(a, b, sortKey))
    : defaultSort(rows);
  const open = sorted.filter((r) => !r.vollstaendig);
  const done = sorted.filter((r) => r.vollstaendig);
  return [...open, ...done];
}

function buildMailRows(rows) {
  const open = rows.filter((r) => r.fehlmenge > 0 && !r.bestellt && !r.vollstaendig);
  const groups = groupBy(open, (r) => comboKey(r));
  return Object.values(groups).map((arr) => ({
    bezeichnung: arr[0].bezeichnung,
    groesse: arr[0].groesse,
    laenge: arr[0].laenge,
    oberflaeche: arr[0].oberflaeche,
    menge: arr.reduce((s, r) => s + Number(r.fehlmenge || 0), 0),
  }));
}

export default function EinkaufView({ items, project, updateItem }) {
  const [mailError, setMailError] = useState(null);
  const [manualValues, setManualValues] = useState(readManualValues);
  const [search, setSearch] = useState("");
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);

  const enriched = items.map((i) => {
    const parsed = parseEinbauort(i.einbauort, project?.baugruppe);
    return { ...i, ...parsed };
  });

  const combos = groupBy(enriched, articleIdentityKey);
  const rows = Object.values(combos)
    .map((arr) => {
      const first = arr[0];
      const menge = arr.reduce((s, i) => s + Number(i.menge || 0), 0);
      const geliefert = arr.reduce((s, i) => s + Number(i.bereit || 0), 0);
      const fehlmenge = Math.max(0, menge - geliefert);
      const vollstaendig = menge > 0 && fehlmenge === 0;
      const herkunft = buildHerkunftProject(arr);
      return {
        key: `${project.id}|${comboKey(first)}`,
        bezeichnung: first.bezeichnung,
        groesse: first.groesse,
        laenge: first.laenge,
        oberflaeche: first.oberflaeche,
        menge,
        geliefert,
        fehlmenge,
        vollstaendig,
        herkunft,
        bestellt: arr.every((i) => i.bestellt),
        important_note: arr.some((i) => i.important_note),
        items: arr,
      };
    })
    .filter((r) => r.fehlmenge > 0 || r.vollstaendig);

  const filtered = filterBySearch(rows, search, (row) => [
    project?.nr,
    project?.name,
    row.bezeichnung,
    row.groesse,
    row.laenge,
    row.oberflaeche,
    ...herkunftSearchParts(row.herkunft, row.items).filter(
      (p) => String(p || "").toLowerCase() !== "automatisch ergänzt"
    ),
    ...collectUniqueHinweise(row.items).map((h) => h.text),
    ...sizeLengthSearchParts(row.groesse, row.laenge),
  ]);
  const allRows = sortCartRows(filtered, sortKey, sortDir);
  const status = baugruppeStatus(enriched);
  const pStatus = projectStatus(project, items);

  function handleBestelltChange(row, checked) {
    row.items.forEach((i) => updateItem(i.id, { bestellt: checked }));
  }

  function handleAllBestelltChange(rowsList, checked) {
    rowsList.forEach((row) => row.items.forEach((i) => updateItem(i.id, { bestellt: checked })));
  }

  function rememberManualValue(rowKey, value) {
    setManualValues((prev) => {
      const next = { ...prev, [rowKey]: value };
      writeManualValues(next);
      return next;
    });
  }

  function handleGeliefertChange(row, value) {
    const v = Number(value) || 0;
    rememberManualValue(row.key, v);
    distribute(row.items, v).forEach((u) => updateItem(u.id, { bereit: u.bereit }));
  }

  function handleVollstaendigGeliefertChange(row, checked) {
    if (checked) {
      rememberManualValue(row.key, row.geliefert);
      distribute(row.items, row.menge).forEach((u) => updateItem(u.id, { bereit: u.bereit }));
    } else {
      const v = manualValues[row.key] || 0;
      distribute(row.items, v).forEach((u) => updateItem(u.id, { bereit: u.bereit }));
    }
  }

  async function handleMailRequest() {
    setMailError(null);
    const mailRows = buildMailRows(allRows);
    if (!mailRows.length) {
      setMailError("Es sind keine noch anzufragenden Positionen vorhanden.");
      return;
    }
    const result = await prepareAndOpenMailRequest({
      projectName: project.name,
      rows: mailRows,
    });
    if (!result.ok) setMailError(result.error);
  }

  return (
    <div className="card">
      <div className="row">
        <h2>
          Warenkorb{" "}
          <span className="statusPill" title={status.label}>
            {status.emoji} {status.label}
          </span>
        </h2>
        <div className="toolbarButtons">
          <button className="ghost" onClick={handleMailRequest}>
            Anfrage per Mail
          </button>
        </div>
      </div>
      {mailError && <p className="hint dangerText">{mailError}</p>}
      <p className="hint">
        Projektweite Fehlmengen. Vollständig gelieferte Positionen bleiben sichtbar (grün) und können
        wieder deaktiviert werden. Status: {pStatus.label}.
      </p>
      <SearchField value={search} onChange={setSearch} />
      {allRows.length === 0 && <p>Keine Positionen im Warenkorb.</p>}
      {allRows.length > 0 && (
        <label className="checkboxLine allBestelltLine">
          <input
            type="checkbox"
            checked={allRows.length > 0 && allRows.every((r) => r.bestellt)}
            onChange={(e) => handleAllBestelltChange(allRows, e.target.checked)}
          />
          Alle Positionen bestellt
        </label>
      )}
      {allRows.length > 0 && (
        <div className="tableWrap">
          <table>
            <tbody>
              <tr>
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
                <th className="sortableTh" onClick={() => toggleSort("fehlmenge")}>
                  Fehlmenge{arrow("fehlmenge")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("bestellt")}>
                  Bestellt{arrow("bestellt")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("geliefert")}>
                  Geliefert{arrow("geliefert")}
                </th>
                <th className="sortableTh colHerkunft" onClick={() => toggleSort("herkunft")}>
                  Herkunft{arrow("herkunft")}
                </th>
              </tr>
              {allRows.map((row) => {
                const vis = herkunftVisibleParts(row.herkunft, search);
                return (
                  <tr key={row.key} className={row.vollstaendig ? "rowDone" : undefined}>
                    <td>{row.bezeichnung}</td>
                    <td>{row.groesse}</td>
                    <td>{row.laenge}</td>
                    <td>{row.oberflaeche}</td>
                    <td>
                      <span className={"badge " + (row.fehlmenge > 0 ? "red" : "green")}>
                        {row.fehlmenge}
                      </span>
                    </td>
                    <td>
                      <label className="checkboxLine">
                        <input
                          type="checkbox"
                          checked={row.bestellt}
                          onChange={(e) => handleBestelltChange(row, e.target.checked)}
                        />
                        Bestellt
                      </label>
                    </td>
                    <td>
                      <div className="lagerVorhanden">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={row.geliefert}
                          disabled={row.vollstaendig}
                          onChange={(e) => handleGeliefertChange(row, e.target.value)}
                        />
                        <label className="checkboxLine">
                          <input
                            type="checkbox"
                            checked={row.vollstaendig}
                            onChange={(e) =>
                              handleVollstaendigGeliefertChange(row, e.target.checked)
                            }
                          />
                          Vollständig geliefert
                        </label>
                      </div>
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
