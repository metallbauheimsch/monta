import { useMemo, useState } from "react";
import { sortByPosNumber } from "./technikerUtils";
import { parseEinbauort, formatEinbauort } from "../../utils/structure";
import { regalOrderIndex, getRegalPlatz } from "./regalOrder";
import { groupBy, baugruppeStatus } from "../../utils/helpers";

// Druck unterstützt mehrere Sortierungen. Sprint 5: "Bauteil"/"Artikel"
// durch "Baugruppe" und "Regal" ersetzt (Regal = Paternoster-Reihenfolge,
// siehe regalOrder.js). Standard bleibt Sortierung nach Position.
//
// Sprint 5 Erweiterung #4: bei Sortierung "Baugruppe" wird zusätzlich in
// Abschnitte je Baugruppe gruppiert, mit Materialstatus-Ampel in der
// Abschnittsüberschrift (oberhalb jeder Baugruppe).
//
// Sprint 6: Sortierung "Baugruppe" ist die Montageunterlage (kein eigener
// Montage-Reiter) und gliedert deshalb zusätzlich je Baugruppe nach Bauteil
// (Projekt -> Baugruppe -> Bauteil -> Material), damit die Zuordnung zum
// Bauteil beim Ausdruck klar erkennbar bleibt.
//
// Sprint 6 Ergänzung #13: Gleiche Verbindungsmittel innerhalb desselben
// Bauteils (gleiche Bezeichnung/Größe/Länge/Ausführung) werden für die
// Anzeige zu einer Zeile zusammengefasst, Mengen addiert. Die
// Materialstatus-Ampel je Baugruppe wird weiterhin aus den ursprünglichen
// Einzelpositionen berechnet (unverändert).
function aggregateForPrint(items, project) {
  const groups = new Map();
  items.forEach((item) => {
    const { baugruppe, bauteil } = parseEinbauort(item.einbauort, project?.baugruppe);
    const key = [baugruppe, bauteil, item.bezeichnung, item.groesse, item.laenge, item.oberflaeche].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        id: item.id,
        einbauort: formatEinbauort(baugruppe, bauteil),
        bezeichnung: item.bezeichnung,
        groesse: item.groesse,
        laenge: item.laenge,
        oberflaeche: item.oberflaeche,
        menge: 0,
        _positions: [],
        _hinweise: [],
      });
    }
    const g = groups.get(key);
    g.menge += Number(item.menge || 0);
    if (item.pos) g._positions.push(String(item.pos));
    if (item.hinweis && !g._hinweise.includes(item.hinweis)) g._hinweise.push(item.hinweis);
  });
  return Array.from(groups.values()).map((g) => ({
    ...g,
    pos: g._positions.join(", "),
    hinweis: g._hinweise.join("; "),
  }));
}

const SORT_OPTIONS = [
  { key: "position", label: "Position" },
  { key: "baugruppe", label: "Baugruppe (Montage)" },
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
      const diff = regalOrderIndex(a) - regalOrderIndex(b);
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
      <td>{getRegalPlatz(item)}</td>
      <td>{item.hinweis}</td>
    </tr>
  );
}

// Kompakte Tabelle für die Montageunterlage: Baugruppe/Bauteil stehen
// bereits als Überschrift darüber, deshalb hier nicht nochmal als Spalte.
function MontageTableHead() {
  return (
    <tr>
      <th>Pos.</th><th>Menge</th><th>Bezeichnung</th>
      <th>Größe</th><th>Länge</th><th>Ausführung</th><th>Regal</th><th>Hinweis</th>
    </tr>
  );
}

function MontageRow({ item, idx }) {
  return (
    <tr>
      <td>{item.pos || idx + 1}</td>
      <td>{item.menge}</td>
      <td>{item.bezeichnung}</td>
      <td>{item.groesse}</td>
      <td>{item.laenge}</td>
      <td>{item.oberflaeche}</td>
      <td>{getRegalPlatz(item)}</td>
      <td>{item.hinweis}</td>
    </tr>
  );
}

export default function PrintView({ project, items, isBaugruppeBestellt }) {
  const [sortBy, setSortBy] = useState("position");
  const aggregatedItems = useMemo(() => aggregateForPrint(items, project), [items, project]);
  const sortedItems = useMemo(() => sortItems(aggregatedItems, sortBy, project), [aggregatedItems, sortBy, project]);

  const groupedByBaugruppe = sortBy === "baugruppe";
  const sections = useMemo(() => {
    if (!groupedByBaugruppe) return null;
    // Status-Ampel je Baugruppe weiterhin aus den ungekürzten Einzelpositionen
    // berechnen, damit "bereits gelegt"-Mengen korrekt einfließen.
    const rawGroups = groupBy(items, (i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe);
    const groups = groupBy(sortedItems, (i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe);
    return Object.entries(groups).map(([bg, arr]) => {
      const bauteilGroups = groupBy(arr, (i) => parseEinbauort(i.einbauort, project?.baugruppe).bauteil);
      return [bg, rawGroups[bg] || [], Object.entries(bauteilGroups)];
    });
  }, [groupedByBaugruppe, sortedItems, items, project]);

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
        sections.map(([bg, arr, bauteilSections]) => {
          const bestellt = isBaugruppeBestellt?.(project.id, bg) || false;
          const status = baugruppeStatus(arr, bestellt);
          return (
            <div className="printBaugruppeSection" key={bg}>
              <h3>{status.emoji} {bg} <small>({status.label})</small></h3>
              {bauteilSections.map(([bt, btItems]) => (
                <div className="printBauteilSection" key={bt}>
                  <h4>Bauteil {bt}</h4>
                  <table>
                    <tbody>
                      <MontageTableHead />
                      {btItems.map((i, idx) => (
                        <MontageRow key={i.id} item={i} idx={idx} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
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
