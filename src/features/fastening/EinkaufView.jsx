import { useState } from "react";
import { articleKey, groupBy, baugruppeStatus } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";
import { naturalCompare, useSortableColumns } from "../../utils/sorting";
import { distribute, readManualValues, writeManualValues } from "./stock";
import { buildHerkunft } from "./herkunft";
import { prepareAndOpenMailRequest } from "../../utils/mailRequest";

// Warenkorb: komplettes Projekt, gruppiert nach Baugruppe und Artikel.
// Zeigt Fehlmengen und - bewusst - auch vollständig gelieferte Positionen
// (grün, am Ende der Tabelle), damit ein versehentlicher Klick auf
// "Vollständig geliefert" rückgängig gemacht werden kann. Keine
// automatische Ausblendung mehr (Abschlusskorrekturen vor Pilot).
//
// Spalte "Regalfach" absichtlich nicht vorhanden (bleibt in Lager/Druck).
// Statusampel folgt aus bestellt/bereit an der Position (helpers.js).
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

// Sortierung der sichtbaren Zeilen, danach vollständig gelieferte ans Ende
// (unabhängig von der gewählten Spaltensortierung).
function sortCartRows(rows, sortKey, sortDir) {
  const sorted = sortKey
    ? [...rows].sort((a, b) => (sortDir === "desc" ? -1 : 1) * compareByColumn(a, b, sortKey))
    : defaultSort(rows);
  const open = sorted.filter((r) => !r.vollstaendig);
  const done = sorted.filter((r) => r.vollstaendig);
  return [...open, ...done];
}

// Für die Mail-Anfrage nur noch offene Fehlmengen - vollständig gelieferte
// Positionen gehören nicht in die Angebotsanfrage.
function buildMailRows(rows) {
  const open = rows.filter((r) => r.fehlmenge > 0);
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
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);

  const enriched = items.map((i) => ({ ...i, ...parseEinbauort(i.einbauort, project?.baugruppe) }));
  const byBaugruppe = groupBy(enriched, (i) => i.baugruppe);
  const baugruppeNames = Object.keys(byBaugruppe).sort((a, b) => naturalCompare(a, b));

  const sectionRows = {};
  baugruppeNames.forEach((bg) => {
    const combos = groupBy(byBaugruppe[bg], articleKey);
    const rows = Object.values(combos)
      .map((arr) => {
        const first = arr[0];
        const menge = arr.reduce((s, i) => s + Number(i.menge || 0), 0);
        const geliefert = arr.reduce((s, i) => s + Number(i.bereit || 0), 0);
        const fehlmenge = Math.max(0, menge - geliefert);
        const vollstaendig = menge > 0 && fehlmenge === 0;
        return {
          key: `${project.id}|${bg}|${comboKey(first)}`,
          bezeichnung: first.bezeichnung,
          groesse: first.groesse,
          laenge: first.laenge,
          oberflaeche: first.oberflaeche,
          menge,
          geliefert,
          fehlmenge,
          vollstaendig,
          herkunft: buildHerkunft(bg, arr),
          bestellt: arr.every((i) => i.bestellt),
          items: arr,
        };
      })
      // Offen (Fehlmenge > 0) oder vollständig geliefert: beides bleibt
      // sichtbar. Reine Lager-Vollständigkeit ohne jemals geliefert worden
      // zu sein (geliefert = 0 und fehlmenge = 0) kommt hier nicht vor,
      // weil fehlmenge = 0 und geliefert = 0 nur bei menge = 0 eintreten.
      .filter((r) => r.fehlmenge > 0 || r.vollstaendig);
    sectionRows[bg] = sortCartRows(rows, sortKey, sortDir);
  });

  const baugruppeNamesWithRows = baugruppeNames.filter((bg) => sectionRows[bg].length > 0);
  const allRows = baugruppeNamesWithRows.flatMap((bg) => sectionRows[bg]);

  function handleBestelltChange(row, checked) {
    row.items.forEach((i) => updateItem(i.id, { bestellt: checked }));
  }

  // Sammel-Checkbox betrifft alle aktuell sichtbaren Zeilen (inkl. bereits
  // vollständig gelieferter) - Haken-Status wird aus den Zeilen berechnet.
  function handleAllBestelltChange(rows, checked) {
    rows.forEach((row) => row.items.forEach((i) => updateItem(i.id, { bestellt: checked })));
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

  // "Vollständig geliefert": Zeile bleibt sichtbar (grün, ans Ende). Beim
  // Deaktivieren wird der vorherige manuelle Wert wiederhergestellt.
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
      setMailError("Der Warenkorb enthält keine offenen Positionen.");
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
        <h2>Warenkorb</h2>
        <div className="toolbarButtons">
          <button className="ghost" onClick={handleMailRequest}>Anfrage per Mail</button>
        </div>
      </div>
      {mailError && <p className="hint dangerText">{mailError}</p>}
      <p className="hint">
        Fehlmengen aus dem Lager, komplettes Projekt. Vollständig gelieferte Positionen bleiben sichtbar (grün) und können wieder deaktiviert werden.
      </p>
      {baugruppeNamesWithRows.length === 0 && <p>Keine Positionen im Warenkorb.</p>}
      {baugruppeNamesWithRows.length > 0 && (
        <label className="checkboxLine allBestelltLine">
          <input
            type="checkbox"
            checked={allRows.length > 0 && allRows.every((r) => r.bestellt)}
            onChange={(e) => handleAllBestelltChange(allRows, e.target.checked)}
          />
          Alle Positionen bestellt
        </label>
      )}
      {baugruppeNamesWithRows.map((bg) => {
        const rows = sectionRows[bg];
        const status = baugruppeStatus(byBaugruppe[bg]);

        return (
          <section className="baugruppeSection" key={bg}>
            <h3>{status.emoji} {bg}</h3>
            <div className="tableWrap">
              <table>
                <tbody>
                  <tr>
                    <th className="sortableTh" onClick={() => toggleSort("bezeichnung")}>Bezeichnung{arrow("bezeichnung")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("groesse")}>Größe{arrow("groesse")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("laenge")}>Länge{arrow("laenge")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("oberflaeche")}>Ausführung{arrow("oberflaeche")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("fehlmenge")}>Fehlmenge{arrow("fehlmenge")}</th>
                    <th>Herkunft</th>
                    <th className="sortableTh" onClick={() => toggleSort("bestellt")}>Bestellt{arrow("bestellt")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("geliefert")}>Geliefert{arrow("geliefert")}</th>
                  </tr>
                  {rows.map((row) => (
                    <tr key={row.key} className={row.vollstaendig ? "rowDone" : undefined}>
                      <td>{row.bezeichnung}</td>
                      <td>{row.groesse}</td>
                      <td>{row.laenge}</td>
                      <td>{row.oberflaeche}</td>
                      <td>
                        <span className={"badge " + (row.fehlmenge > 0 ? "red" : "green")}>{row.fehlmenge}</span>
                      </td>
                      <td>
                        {row.herkunft.map((h) => (
                          <div key={h.bauteil} className="herkunftLine">
                            <div>{h.baugruppe} · {h.bauteil}</div>
                            {h.positions.length > 0 && (
                              <div className="hint">Pos. {h.positions.join(", ")}</div>
                            )}
                          </div>
                        ))}
                      </td>
                      <td>
                        <label className="checkboxLine">
                          <input
                            type="checkbox"
                            checked={row.bestellt}
                            onChange={(e) => handleBestelltChange(row, e.target.checked)}
                          />
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
                              onChange={(e) => handleVollstaendigGeliefertChange(row, e.target.checked)}
                            />
                            Vollständig geliefert
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
