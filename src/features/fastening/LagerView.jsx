import { groupBy } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";

// Lager (Sprint 5 Erweiterung #1/#2): baugleiche Positionen werden je
// Baugruppe automatisch zusammengefasst (gleiche Bezeichnung/Größe/Länge/
// Ausführung), Mengen werden addiert. Keine ausklappbaren Bereiche - die
// Herkunft (Bauteil – Menge) steht direkt und immer sichtbar darunter.
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

export default function LagerView({ items, updateItem, project }) {
  const enriched = items.map((i) => ({ ...i, ...parseEinbauort(i.einbauort, project?.baugruppe) }));
  const byBaugruppe = groupBy(enriched, (i) => i.baugruppe);
  const baugruppeNames = Object.keys(byBaugruppe).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  function applyGelegt(rowItems, value) {
    distribute(rowItems, value).forEach((u) => updateItem(u.id, { bereit: u.bereit }));
  }

  return (
    <div className="card">
      <h2>Lager</h2>
      <p className="hint">
        Baugleiche Positionen je Baugruppe zusammengefasst. Restmenge = Gesamtmenge − bereits gelegt.
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
              key: comboKey(first),
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
          .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));

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
                    <span className="badge">Gesamt: {row.menge}</span>
                  </div>
                  <div className="lagerControls">
                    <label className="checkboxLine">
                      <input
                        type="checkbox"
                        checked={complete}
                        onChange={(e) => applyGelegt(row.items, e.target.checked ? row.menge : 0)}
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
                        onChange={(e) => applyGelegt(row.items, Number(e.target.value))}
                      />
                    </label>
                    <span className={"badge " + (row.rest > 0 ? "red" : "green")}>Restmenge: {row.rest}</span>
                  </div>
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
