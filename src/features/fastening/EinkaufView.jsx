import { articleKey, groupBy, baugruppeStatus, remainingQty } from "../../utils/helpers";
import { parseEinbauort } from "../../utils/structure";

// Bestellliste (Sprint 5 Erweiterung #3/#6): gleicher Aufbau wie die
// Druckansicht - immer das komplette Projekt, sortiert Baugruppe -> Artikel,
// keine ausklappbaren Bereiche. Pro Baugruppe steht eine Checkbox
// "Bestellung erfolgt" (schaltet den Status von Offen auf Bestellt), pro
// Artikel Größe/Länge/Ausführung/Bestellmenge + Herkunft (Bauteil – Menge).
// Nur Positionen mit Restmenge > 0 erscheinen (automatisch aus "bereit").
export default function EinkaufView({ items, project, isBaugruppeBestellt, setBaugruppeBestellt }) {
  const enriched = items.map((i) => ({
    ...i,
    ...parseEinbauort(i.einbauort, project?.baugruppe),
    _rest: remainingQty(i),
  }));
  const missing = enriched.filter((i) => i._rest > 0);
  const byBaugruppe = groupBy(missing, (i) => i.baugruppe);
  const baugruppeNames = Object.keys(byBaugruppe).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return (
    <div className="card">
      <h2>Bestellliste</h2>
      <p className="hint">Komplettes Projekt, gruppiert nach Baugruppe und Artikel. Nur offene Restmengen.</p>
      {baugruppeNames.length === 0 && <p>Keine offenen Bestellmengen.</p>}
      {baugruppeNames.map((bg) => {
        const bgAllItems = enriched.filter((i) => i.baugruppe === bg);
        const bestellt = isBaugruppeBestellt?.(project.id, bg) || false;
        const status = baugruppeStatus(bgAllItems, bestellt);

        const articleGroups = groupBy(byBaugruppe[bg], articleKey);
        const rows = Object.entries(articleGroups)
          .map(([key, arr]) => {
            const first = arr[0];
            const bestellmenge = arr.reduce((s, i) => s + i._rest, 0);
            const herkunft = arr.map((i) => ({ id: i.id, bauteil: i.bauteil, menge: i._rest }));
            return {
              key,
              bezeichnung: first.bezeichnung,
              groesse: first.groesse,
              laenge: first.laenge,
              oberflaeche: first.oberflaeche,
              bestellmenge,
              herkunft,
            };
          })
          .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));

        return (
          <section className="baugruppeSection" key={bg}>
            <div className="row">
              <h3>{status.emoji} {bg}</h3>
              <label className="checkboxLine">
                <input
                  type="checkbox"
                  checked={bestellt}
                  onChange={(e) => setBaugruppeBestellt?.(project.id, bg, e.target.checked)}
                />
                Bestellung erfolgt
              </label>
            </div>
            {rows.map((r) => (
              <div className="workflowCard" key={r.key}>
                <div className="row">
                  <b>
                    {r.bezeichnung} {r.groesse}
                    {r.laenge ? `×${r.laenge}` : ""} {r.oberflaeche}
                  </b>
                  <span className="badge yellow">Bestellmenge: {r.bestellmenge}</span>
                </div>
                <ul className="simpleList">
                  {r.herkunft.map((h) => (
                    <li key={h.id}>{h.bauteil} – {h.menge}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
