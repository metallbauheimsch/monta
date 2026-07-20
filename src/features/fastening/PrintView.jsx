import { useMemo } from "react";
import { sortByPosNumber, uniqueSortedPositions } from "./technikerUtils";
import { parseEinbauort, formatEinbauort, buildBaugruppeSections, getBauteilgruppe } from "../../utils/structure";
import { naturalCompare, useSortableColumns } from "../../utils/sorting";
import { regalOrderIndex, getRegalPlatz } from "./regalOrder";
import { groupBy, baugruppeStatus } from "../../utils/helpers";

// Druckansicht / Montageunterlage (Sprint 7): zeigt immer nur die aktuell
// geöffnete Baugruppe (items kommen bereits vorgefiltert von TabContent).
// Die Darstellung ist deshalb immer nach Bauteil gegliedert (Projekt ->
// Baugruppe [aktuell] -> Bauteilgruppe -> Bauteil -> Material). Die
// Bauteilgruppen folgen der Anlage-Reihenfolge (structureRows); die
// gewählte Sortierung bestimmt nur die Reihenfolge der Materialzeilen
// INNERHALB jedes Bauteils.
//
// Sprint 7: Sortierung "Baugruppe (Montage)" entfernt (war nur nötig, als
// die Druckansicht noch alle Baugruppen gleichzeitig zeigte). Dafür neu:
// Sortierung nach Bezeichnung/Größe/Länge (zusätzlich zu Position/Regal).
//
// Gleiche Verbindungsmittel innerhalb desselben Bauteils (gleiche
// Bezeichnung/Größe/Länge/Ausführung) werden weiterhin zu einer Zeile
// zusammengefasst, Mengen addiert (unverändert aus Sprint 6).
//
// Sprint 7 Abschluss (Punkt 6): "Regal" -> "Regalfach" (Beschriftung wie in
// Lager/Warenkorb), Positionsnummern beim Zusammenfassen jetzt numerisch
// sortiert und ohne Duplikate (siehe uniqueSortedPositions), engere Abstände
// je Bauteil-Abschnitt (siehe style.css).
//
// Sprint 7 - Korrekturen aus Praxistest (Punkt 7): die separaten
// Sortierbuttons wurden entfernt. Sortiert wird jetzt wie in TB/Lager/
// Warenkorb über anklickbare Spaltenüberschriften (ein gemeinsamer
// Sortierzustand für alle Bauteil-Tabellen der Seite).
function aggregateForPrint(items, project, structureRows) {
  const groups = new Map();
  items.forEach((item) => {
    const { baugruppe, bauteil } = parseEinbauort(item.einbauort, project?.baugruppe);
    const bauteilgruppe = getBauteilgruppe(structureRows, project?.id, baugruppe, bauteil);
    const key = [bauteil, item.bezeichnung, item.groesse, item.laenge, item.oberflaeche].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        id: item.id,
        einbauort: formatEinbauort(baugruppe, bauteil),
        bezeichnung: item.bezeichnung,
        groesse: item.groesse,
        laenge: item.laenge,
        oberflaeche: item.oberflaeche,
        bauteilgruppe,
        menge: 0,
        _items: [],
        _hinweise: [],
      });
    }
    const g = groups.get(key);
    g.menge += Number(item.menge || 0);
    g._items.push(item);
    if (item.hinweis && !g._hinweise.includes(item.hinweis)) g._hinweise.push(item.hinweis);
  });
  // Positionsnummern numerisch sortiert und ohne Duplikate (Sprint 7
  // Abschluss, Punkt 6) - konsistent mit Herkunft in Lager/Warenkorb.
  return Array.from(groups.values()).map((g) => ({
    ...g,
    pos: uniqueSortedPositions(g._items).join(", "),
    hinweis: g._hinweise.join("; "),
  }));
}

function posValue(item) {
  const n = parseInt(String(item.pos ?? "").trim(), 10);
  return Number.isNaN(n) ? Infinity : n;
}

// Ohne aktive Sortierung gilt die Positionsnummer als Standard (wie bisher).
function defaultSort(items) {
  return sortByPosNumber([...items]);
}

function compareByColumn(a, b, key) {
  if (key === "pos") return posValue(a) - posValue(b);
  if (key === "menge") return (Number(a.menge) || 0) - (Number(b.menge) || 0);
  if (key === "regal") return regalOrderIndex(a) - regalOrderIndex(b);
  return naturalCompare(a[key], b[key]);
}

function sortRows(items, sortKey, sortDir) {
  if (!sortKey) return defaultSort(items);
  return [...items].sort(
    (a, b) => (sortDir === "desc" ? -1 : 1) * compareByColumn(a, b, sortKey) || posValue(a) - posValue(b)
  );
}

// Kompakte Tabelle für die Montageunterlage: Bauteil steht bereits als
// Überschrift darüber, deshalb hier nicht nochmal als Spalte. Spalten sind
// anklickbar sortierbar (wie in TB/Lager/Warenkorb) - ein gemeinsamer
// Sortierzustand für alle Bauteil-Tabellen dieser Seite.
function MontageTableHead({ toggleSort, arrow }) {
  return (
    <tr>
      <th className="sortableTh" onClick={() => toggleSort("pos")}>Pos.{arrow("pos")}</th>
      <th className="sortableTh" onClick={() => toggleSort("menge")}>Menge{arrow("menge")}</th>
      <th className="sortableTh" onClick={() => toggleSort("bezeichnung")}>Bezeichnung{arrow("bezeichnung")}</th>
      <th className="sortableTh" onClick={() => toggleSort("groesse")}>Größe{arrow("groesse")}</th>
      <th className="sortableTh" onClick={() => toggleSort("laenge")}>Länge{arrow("laenge")}</th>
      <th className="sortableTh" onClick={() => toggleSort("oberflaeche")}>Ausführung{arrow("oberflaeche")}</th>
      <th className="sortableTh" onClick={() => toggleSort("regal")}>Regalfach{arrow("regal")}</th>
      <th>Hinweis</th>
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

function BauteilBlock({ bauteil, items, toggleSort, arrow, headingTag: Heading = "h4" }) {
  return (
    <div className="printBauteilSection">
      <Heading>Bauteil: {bauteil}</Heading>
      <table>
        <tbody>
          <MontageTableHead toggleSort={toggleSort} arrow={arrow} />
          {items.map((i, idx) => (
            <MontageRow key={i.id} item={i} idx={idx} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrintView({ project, baugruppe, items, structureRows }) {
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);
  const aggregatedItems = useMemo(
    () => aggregateForPrint(items, project, structureRows),
    [items, project, structureRows]
  );

  const status = baugruppeStatus(items);

  const printSections = useMemo(() => {
    const byBauteil = groupBy(
      aggregatedItems,
      (i) => parseEinbauort(i.einbauort, project?.baugruppe).bauteil
    );
    const bauteile = Object.keys(byBauteil);
    const sections = buildBaugruppeSections(project?.id, baugruppe, bauteile, structureRows || []);

    return sections
      .map((section) => {
        const bauteilBlocks = section.bauteile
          .filter((bt) => byBauteil[bt]?.length)
          .map((bt) => ({
            bauteil: bt,
            items: sortRows(byBauteil[bt], sortKey, sortDir),
          }));
        return { ...section, bauteilBlocks };
      })
      .filter((section) => section.bauteilBlocks.length > 0);
  }, [aggregatedItems, sortKey, sortDir, project, baugruppe, structureRows]);

  return (
    <div className="card printArea">
      <div className="row noPrint">
        <button onClick={() => window.print()}>Drucken</button>
      </div>
      <h2>Befestigungsmaterial</h2>
      <p>{project.nr} {project.name} · {project.zeichnung}</p>
      <h3>{status.emoji} {baugruppe} <small>({status.label})</small></h3>

      {printSections.length === 0 && <p>Keine Materialpositionen in dieser Baugruppe.</p>}
      {printSections.map((section) => {
        const showGruppe = Boolean(section.bauteilgruppe);
        const blocks = section.bauteilBlocks.map(({ bauteil, items: btItems }) => (
          <BauteilBlock
            key={bauteil}
            bauteil={bauteil}
            items={btItems}
            toggleSort={toggleSort}
            arrow={arrow}
            headingTag={showGruppe ? "h5" : "h4"}
          />
        ));

        if (!showGruppe) {
          return <div key="ungrouped">{blocks}</div>;
        }

        return (
          <div className="printGruppeSection" key={section.bauteilgruppe}>
            <h4>Bauteilgruppe: {section.bauteilgruppe}</h4>
            {blocks}
          </div>
        );
      })}
    </div>
  );
}
