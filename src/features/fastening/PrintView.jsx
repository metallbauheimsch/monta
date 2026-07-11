import { useMemo, useState } from "react";
import { sortByPosNumber } from "./technikerUtils";
import { parseEinbauort } from "../../utils/structure";
import { regalOrderIndex, getRegalPlatz } from "./regalOrder";
import { groupBy, baugruppeStatus } from "../../utils/helpers";

// Druck unterstützt mehrere Sortierungen. Sprint 5: "Bauteil"/"Artikel"
// durch "Baugruppe" und "Regal" ersetzt (Regal = Paternoster-Reihenfolge,
// siehe regalOrder.js). Standard bleibt Sortierung nach Position.
//
// Sprint 5 Erweiterung #4: bei Sortierung "Baugruppe" wird zusätzlich in
// Abschnitte je Baugruppe gruppiert, mit Materialstatus-Ampel in der
// Abschnittsüberschrift (oberhalb jeder Baugruppe).
const SORT_OPTIONS = [
  { key: "position", label: "Position" },
  { key: "baugruppe", label: "Baugruppe" },
  { key: "regal", label: "Regal" },
];

function posValue(item) {
  const n = parseInt(String(item.pos ?? "").trim(), 10);
  return Number.isNaN(n) ? Infinity : n;
}

function sortItems(items, sortBy, project) {
  if (sortBy === "baugruppe") {
    return [...items].sort((a, b) => {
      const ba = parseEinbauort(a.einbauort, project?.baugruppe).baugruppe;
      const bb = parseEinbauort(b.einbauort, project?.baugruppe).baugruppe;
      return ba.localeCompare(bb, undefined, { numeric: true }) || posValue(a) - posValue(b);
    });
  }
  if (sortBy === "regal") {
    return [...items].sort((a, b) => {
      const diff = regalOrderIndex(a.bezeichnung) - regalOrderIndex(b.bezeichnung);
      return diff !== 0 ? diff : posValue(a) - posValue(b);
    });
  }
  return sortByPosNumber(items);
}

function PrintTableHead() {
  return (
    <tr>
      <th>Pos.</th><th>Baugruppe</th><th>Bauteil</th><th>Menge</th><th>Bezeichnung</th>
      <th>Größe</th><th>Länge</th><th>Ausführung</th><th>Regal</th><th>Hinweis</th>
    </tr>
  );
}

function PrintRow({ item, idx, project }) {
  const { baugruppe, bauteil } = parseEinbauort(item.einbauort, project?.baugruppe);
  return (
    <tr>
      <td>{item.pos || idx + 1}</td>
      <td>{baugruppe}</td>
      <td>{bauteil}</td>
      <td>{item.menge}</td>
      <td>{item.bezeichnung}</td>
      <td>{item.groesse}</td>
      <td>{item.laenge}</td>
      <td>{item.oberflaeche}</td>
      <td>{getRegalPlatz(item.bezeichnung)}</td>
      <td>{item.hinweis}</td>
    </tr>
  );
}

export default function PrintView({ project, items, isBaugruppeBestellt }) {
  const [sortBy, setSortBy] = useState("position");
  const sortedItems = useMemo(() => sortItems(items, sortBy, project), [items, sortBy, project]);

  const groupedByBaugruppe = sortBy === "baugruppe";
  const sections = useMemo(() => {
    if (!groupedByBaugruppe) return null;
    const groups = groupBy(sortedItems, (i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe);
    return Object.entries(groups);
  }, [groupedByBaugruppe, sortedItems, project]);

  return (
    <div className="card printArea">
      <div className="row noPrint">
        <button onClick={() => window.print()}>Drucken</button>
        <div className="sortSwitch">
          <span className="hint">Sortierung:</span>
          {SORT_OPTIONS.map((o) => (
            <button key={o.key} className={sortBy === o.key ? "active" : ""} onClick={() => setSortBy(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <h2>Befestigungsmaterial</h2>
      <p>{project.nr} {project.name} · {project.baugruppe} · {project.zeichnung}</p>

      {groupedByBaugruppe ? (
        sections.map(([bg, arr]) => {
          const bestellt = isBaugruppeBestellt?.(project.id, bg) || false;
          const status = baugruppeStatus(arr, bestellt);
          return (
            <div className="printBaugruppeSection" key={bg}>
              <h3>{status.emoji} {bg} <small>({status.label})</small></h3>
              <table>
                <tbody>
                  <PrintTableHead />
                  {arr.map((i, idx) => (
                    <PrintRow key={i.id} item={i} idx={idx} project={project} />
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      ) : (
        <table>
          <tbody>
            <PrintTableHead />
            {sortedItems.map((i, idx) => (
              <PrintRow key={i.id} item={i} idx={idx} project={project} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
