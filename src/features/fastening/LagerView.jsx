import { useState } from "react";
import { groupBy, baugruppeStatus } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";
import { naturalCompare, useSortableColumns } from "../../utils/sorting";
import { regalOrderIndex, getRegalPlatz } from "./regalOrder";
import { distribute, readManualValues, writeManualValues } from "./stock";
import { buildHerkunft } from "./herkunft";

// Lager (Sprint 5 Erweiterung #1/#2): baugleiche Positionen werden je
// Baugruppe automatisch zusammengefasst (gleiche Bezeichnung/Größe/Länge/
// Ausführung), Mengen werden addiert. Keine ausklappbaren Bereiche - die
// Herkunft (Bauteil – Menge) steht direkt und immer sichtbar in der Zeile.
//
// Sprint 7: wieder als durchgehende Tabelle statt Karten je Artikel (siehe
// Sprint-Auftrag), mit anklickbaren, sortierbaren Spaltenüberschriften.
// Ohne aktive Sortierung gilt weiterhin der tatsächliche Paternoster-
// Laufweg (regalOrderIndex, siehe regalOrder.js) als Standard.
//
// Sprint 7 Abschluss: Spalte "Herkunft / Bauteil" -> "Herkunft", zeigt je
// Bauteil zusätzlich die ursprünglichen TB-Positionsnummern (siehe
// herkunft.js) statt der Menge - so bleibt jede Lagerposition bis zur
// TB-Erfassung eindeutig nachvollziehbar. Zusätzlich Status-Ampel je
// Baugruppe (wie in Warenkorb/Druck), damit alle Ansichten denselben
// Materialstatus zeigen.
//
// Sprint 7 - Korrekturen aus Praxistest: baugruppeStatus liest "bestellt"
// jetzt ausschließlich direkt von den Materialpositionen ab (kein
// separates, manuell gesetztes Baugruppen-Häkchen mehr, siehe helpers.js).
//
// Abschlusskorrektur vor Pilot: vollständig vorhandene Positionen bleiben
// sichtbar, werden dezent grün markiert und ans Tabellenende verschoben
// (gleiche Bedienlogik wie "Vollständig geliefert" im Warenkorb).
function comboKey(item) {
  return [item.bezeichnung, item.groesse, item.laenge, item.oberflaeche].join("|");
}

// Der zuletzt manuell eingegebene "bereits gelegt"-Wert je zusammengefasster
// Position wird jetzt zentral in stock.js gemerkt (readManualValues/
// writeManualValues) - Warenkorb nutzt seit Sprint 7 - Korrekturen dieselbe
// Ablage für seine Checkbox "Vollständig geliefert" (identischer
// Positionsschlüssel), damit es dafür nur eine gemeinsame Datenquelle gibt.

// Standardsortierung: tatsächlicher Paternoster-Laufweg, danach Bezeichnung/
// Größe/Länge als Tie-Breaker (Sprint 6/7).
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
  // "Vorhanden" = gelegt (numerisch, keine Textsortierung).
  if (key === "menge" || key === "rest" || key === "gelegt") {
    return (Number(a[key]) || 0) - (Number(b[key]) || 0);
  }
  return naturalCompare(a[key], b[key]);
}

// Offene Positionen zuerst, vollständig vorhandene zuletzt - innerhalb jeder
// Gruppe gilt die gewählte Spaltensortierung (wie im Warenkorb).
function sortLagerRows(rows, sortKey, sortDir) {
  const sorted = sortKey
    ? [...rows].sort((a, b) => (sortDir === "desc" ? -1 : 1) * compareByColumn(a, b, sortKey))
    : defaultSort(rows);
  const open = sorted.filter((r) => !r.vollstaendig);
  const done = sorted.filter((r) => r.vollstaendig);
  return [...open, ...done];
}

export default function LagerView({ items, updateItem, project }) {
  const [manualValues, setManualValues] = useState(readManualValues);
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);

  const enriched = items.map((i) => ({ ...i, ...parseEinbauort(i.einbauort, project?.baugruppe) }));
  const byBaugruppe = groupBy(enriched, (i) => i.baugruppe);
  const baugruppeNames = Object.keys(byBaugruppe).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

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

  // Eingabe "Vorhanden": Wert direkt übernehmen und als letzten manuellen
  // Wert merken.
  function handleManualChange(row, value) {
    const v = Number(value) || 0;
    rememberManualValue(row.key, v);
    applyGelegt(row.items, v);
  }

  // Checkbox "Vollständig": beim Aktivieren wird der bisherige Wert
  // gemerkt, beim Deaktivieren wieder hergestellt (keine erfundene Menge -
  // siehe Kommentar oben).
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
      <h2>Lager</h2>
      <p className="hint">
        Baugleiche Positionen je Baugruppe zusammengefasst. Standard: Reihenfolge im Paternoster. Restmenge = Gesamtmenge − Vorhanden.
      </p>
      {baugruppeNames.length === 0 && <p>Keine Materialpositionen in diesem Projekt.</p>}
      {baugruppeNames.map((bg) => {
        const combos = groupBy(byBaugruppe[bg], comboKey);
        const rows = Object.values(combos).map((arr) => {
          const first = arr[0];
          const menge = arr.reduce((s, i) => s + Number(i.menge || 0), 0);
          const gelegt = arr.reduce((s, i) => s + Number(i.bereit || 0), 0);
          const rest = Math.max(0, menge - gelegt);
          const vollstaendig = menge > 0 && rest === 0;
          const herkunft = buildHerkunft(bg, arr);
          return {
            key: `${project.id}|${bg}|${comboKey(first)}`,
            bezeichnung: first.bezeichnung,
            groesse: first.groesse,
            laenge: first.laenge,
            oberflaeche: first.oberflaeche,
            menge,
            gelegt,
            rest,
            vollstaendig,
            herkunft,
            items: arr,
          };
        });
        const sortedRows = sortLagerRows(rows, sortKey, sortDir);

        const status = baugruppeStatus(byBaugruppe[bg]);

        return (
          <section className="baugruppeSection" key={bg}>
            <h3>{status.emoji} {bg}</h3>
            <div className="tableWrap">
              <table>
                <tbody>
                  <tr>
                    <th className="sortableTh" onClick={() => toggleSort("regal")}>Regalfach{arrow("regal")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("bezeichnung")}>Bezeichnung{arrow("bezeichnung")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("groesse")}>Größe{arrow("groesse")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("laenge")}>Länge{arrow("laenge")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("oberflaeche")}>Ausführung{arrow("oberflaeche")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("menge")}>Gesamtmenge{arrow("menge")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("gelegt")}>Vorhanden{arrow("gelegt")}</th>
                    <th className="sortableTh" onClick={() => toggleSort("rest")}>Restmenge{arrow("rest")}</th>
                    <th>Herkunft</th>
                  </tr>
                  {sortedRows.map((row) => (
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
