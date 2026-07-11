import { useState } from "react";
import { groupBy } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";
import { regalOrderIndex, getRegalPlatz } from "./regalOrder";

// Lager (Sprint 5 Erweiterung #1/#2): baugleiche Positionen werden je
// Baugruppe automatisch zusammengefasst (gleiche Bezeichnung/Größe/Länge/
// Ausführung), Mengen werden addiert. Keine ausklappbaren Bereiche - die
// Herkunft (Bauteil – Menge) steht direkt und immer sichtbar darunter.
//
// Sprint 6 Ergänzung #14: Sortierung innerhalb jeder Baugruppe nach der
// echten Regalfach-Zuordnung (siehe regalOrder.js) statt nur alphabetisch.
// Es wird bewusst NICHT die frühere Platzhalter-Reihenfolge nach
// Materialarten verwendet - Artikel ohne sichere Fachzuordnung landen unter
// "Ohne Fachzuordnung" am Ende.
function comboKey(item) {
  return [item.bezeichnung, item.groesse, item.laenge, item.oberflaeche].join("|");
}

// Verteilt eine neu eingegebene Gesamt-"bereits gelegt"-Menge auf die
// zusammengefassten Einzelpositionen: füllt sie in ihrer Reihenfolge
// nacheinander bis zur jeweiligen Menge auf. Einfache, nachvollziehbare
// Regel statt einer komplizierten Aufteilung nach Priorität.
function distribute(items, total) {
  let remaining = Math.max(0, Number(total) || 0);
  return items.map((i) => {
    const menge = Number(i.menge || 0);
    const assign = Math.min(menge, remaining);
    remaining -= assign;
    return { id: i.id, bereit: assign };
  });
}

// Merkt sich den zuletzt manuell eingegebenen "bereits gelegt"-Wert je
// zusammengefasster Position (Sprint 6): wird die Checkbox "Vollständig
// vorhanden" wieder deaktiviert, soll keine Menge erfunden werden - der
// vorherige manuelle Wert wird nach Möglichkeit wiederhergestellt. Rein
// clientseitig in localStorage, analog zu utils/structure.js. Schlüssel ist
// projekt-, baugruppen- und artikelgenau, damit sich gleiche Artikel in
// unterschiedlichen Projekten/Baugruppen nicht überschreiben.
const MANUAL_VALUES_KEY = "monta_lager_manuell_v04";

function readManualValues() {
  try {
    return JSON.parse(localStorage.getItem(MANUAL_VALUES_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeManualValues(data) {
  try {
    localStorage.setItem(MANUAL_VALUES_KEY, JSON.stringify(data));
  } catch {
    // localStorage evtl. nicht verfügbar - Wert bleibt nur für die Sitzung erhalten
  }
}

// Wird beim Umbenennen einer Baugruppe aufgerufen (Sprint 6 Ergänzung #11),
// damit gemerkte Werte nicht unter dem alten Namen verwaist zurückbleiben.
export function renameBaugruppeInManualValues(projectId, oldName, newName) {
  const all = readManualValues();
  const oldPrefix = `${projectId}|${oldName}|`;
  const newPrefix = `${projectId}|${newName}|`;
  const next = {};
  Object.entries(all).forEach(([k, v]) => {
    next[k.startsWith(oldPrefix) ? newPrefix + k.slice(oldPrefix.length) : k] = v;
  });
  writeManualValues(next);
}

export default function LagerView({ items, updateItem, project }) {
  const [manualValues, setManualValues] = useState(readManualValues);

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

  // Eingabe "Bereits gelegt": Wert direkt übernehmen und als letzten
  // manuellen Wert merken.
  function handleManualChange(row, value) {
    const v = Number(value) || 0;
    rememberManualValue(row.key, v);
    applyGelegt(row.items, v);
  }

  // Checkbox "Vollständig vorhanden": beim Aktivieren wird der bisherige
  // Wert gemerkt, beim Deaktivieren wieder hergestellt (keine erfundene
  // Menge - siehe Kommentar oben).
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
        Baugleiche Positionen je Baugruppe zusammengefasst, sortiert nach Regalfach. Restmenge = Gesamtmenge − bereits gelegt.
      </p>
      {baugruppeNames.length === 0 && <p>Keine Materialpositionen in diesem Projekt.</p>}
      {baugruppeNames.map((bg) => {
        const combos = groupBy(byBaugruppe[bg], comboKey);
        const rows = Object.values(combos)
          .map((arr) => {
            const first = arr[0];
            const menge = arr.reduce((s, i) => s + Number(i.menge || 0), 0);
            const gelegt = arr.reduce((s, i) => s + Number(i.bereit || 0), 0);
            const rest = Math.max(0, menge - gelegt);
            const herkunft = arr.map((i) => ({ id: i.id, bauteil: i.bauteil, menge: Number(i.menge || 0) }));
            return {
              key: `${project.id}|${bg}|${comboKey(first)}`,
              bezeichnung: first.bezeichnung,
              groesse: first.groesse,
              laenge: first.laenge,
              oberflaeche: first.oberflaeche,
              menge,
              gelegt,
              rest,
              herkunft,
              items: arr,
            };
          })
          .sort((a, b) => {
            const fachDiff = regalOrderIndex(a) - regalOrderIndex(b);
            if (fachDiff !== 0) return fachDiff;
            return (
              a.bezeichnung.localeCompare(b.bezeichnung, undefined, { numeric: true }) ||
              String(a.groesse).localeCompare(String(b.groesse), undefined, { numeric: true }) ||
              String(a.laenge).localeCompare(String(b.laenge), undefined, { numeric: true })
            );
          });

        return (
          <section className="baugruppeSection" key={bg}>
            <h3>{bg}</h3>
            {rows.map((row) => {
              const complete = row.menge > 0 && row.rest === 0;
              return (
                <div className="workflowCard" key={row.key}>
                  <div className="row">
                    <b>
                      {row.bezeichnung} {row.groesse}
                      {row.laenge ? `×${row.laenge}` : ""} {row.oberflaeche}
                    </b>
                    <div className="row" style={{ gap: 8, width: "auto" }}>
                      <span className="badge">{getRegalPlatz(row)}</span>
                      <span className="badge">Gesamt: {row.menge}</span>
                    </div>
                  </div>
                  <div className="lagerControls">
                    <label className="checkboxLine">
                      <input
                        type="checkbox"
                        checked={complete}
                        onChange={(e) => handleCompleteToggle(row, e.target.checked)}
                      />
                      Vollständig vorhanden
                    </label>
                    <label className="inlineField">
                      Bereits gelegt
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={row.gelegt}
                        disabled={complete}
                        onChange={(e) => handleManualChange(row, e.target.value)}
                      />
                    </label>
                    <span className={"badge " + (row.rest > 0 ? "red" : "green")}>Restmenge: {row.rest}</span>
                  </div>
                  {row.rest > 0 && <p className="hint">{row.rest} Stk. in den Warenkorb gelegt</p>}
                  <ul className="simpleList">
                    {row.herkunft.map((h) => (
                      <li key={h.id}>{h.bauteil} – {h.menge}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
