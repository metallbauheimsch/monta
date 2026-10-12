import { useMemo } from "react";
import { dedupeHinweisText } from "../fastening/fasteningRules";
import { buildProjectTbBlocks } from "./projectTbBlocks";

/**
 * Projektweite TB-Übersicht (Sprint 2A): rein lesend. Bearbeitet wird
 * weiterhin ausschließlich im Bauteil-TB (TechnikerEditor) - ein Klick auf
 * eine Bauteil-Überschrift öffnet genau diesen. Keine eigene Datenhaltung:
 * liest dieselben projectItems wie alle übrigen Reiter.
 */
export default function ProjectTbOverview({ project, projectItems, structureRows, openBauteil }) {
  const blocks = useMemo(
    () => buildProjectTbBlocks(project, projectItems, structureRows),
    [project, projectItems, structureRows]
  );

  function open(baugruppe, bauteil) {
    openBauteil?.(baugruppe, bauteil, "tb");
  }

  return (
    <div className="card">
      <h2>TB – gesamtes Projekt</h2>
      <p>
        {project.nr} {project.name}
      </p>
      <p className="hint">Nur Ansicht. Zum Bearbeiten auf das Bauteil tippen.</p>

      {blocks.length === 0 && <p>Noch keine Baugruppen angelegt.</p>}
      {blocks.map(({ baugruppe, status, bauteile }) => (
        <div key={baugruppe} className="printBaugruppeSection">
          <h3>
            {status.emoji} {baugruppe} <small>({status.label})</small>
          </h3>
          {bauteile.length === 0 && <p className="hint">Noch keine Bauteile angelegt.</p>}
          {bauteile.map(({ bauteil, items }) => (
            <div key={`${baugruppe}|${bauteil}`} className="printBauteilSection">
              <h4
                className="tbOverviewBauteilHead"
                role="button"
                tabIndex={0}
                title="Bauteil im TB bearbeiten"
                onClick={() => open(baugruppe, bauteil)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(baugruppe, bauteil);
                  }
                }}
              >
                Bauteil: {bauteil} ›
              </h4>
              {items.length === 0 ? (
                <p className="hint">Keine TB-Positionen.</p>
              ) : (
                <div className="tableWrap">
                  <table className="printMaterialTable">
                    <thead>
                      <tr>
                        <th className="colPos">Pos.</th>
                        <th className="colMenge">Menge</th>
                        <th className="colBez">Bezeichnung</th>
                        <th className="colGr">Größe</th>
                        <th className="colLa">Länge</th>
                        <th className="colAus">Ausführung</th>
                        <th className="colHinweis">Hinweis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((i) => (
                        <tr key={i.id}>
                          <td className="colPos">{i.pos}</td>
                          <td className="colMenge">{i.menge}</td>
                          <td className="colBez">{i.bezeichnung}</td>
                          <td className="colGr">{i.groesse}</td>
                          <td className="colLa">{i.laenge}</td>
                          <td className="colAus">{i.oberflaeche}</td>
                          <td className={"colHinweis" + (i.important_note ? " importantNote" : "")}>
                            {dedupeHinweisText(i.hinweis)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
