import { useMemo, useState } from "react";
import { sortByPosNumber, uniqueSortedPositions } from "./technikerUtils";
import {
  parseEinbauort,
  formatEinbauort,
  buildProjectStructure,
} from "../../utils/structure";
import { naturalCompare, useSortableColumns } from "../../utils/sorting";
import { filterBySearch, sizeLengthSearchParts } from "../../utils/textSearch";
import { regalOrderIndex, getRegalPlatz } from "./regalOrder";
import { groupBy, baugruppeStatus } from "../../utils/helpers";
import { dedupeHinweisText, normalizeHinweisForCompare } from "./fasteningRules";
import SearchField from "../../components/SearchField";

function aggregateForPrint(items, project) {
  const groups = new Map();
  items.forEach((item) => {
    const { baugruppe, bauteil } = parseEinbauort(item.einbauort, project?.baugruppe);
    const key = [bauteil, item.bezeichnung, item.groesse, item.laenge, item.oberflaeche].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        id: item.id,
        einbauort: formatEinbauort(baugruppe, bauteil),
        baugruppe,
        bauteil,
        bezeichnung: item.bezeichnung,
        groesse: item.groesse,
        laenge: item.laenge,
        oberflaeche: item.oberflaeche,
        menge: 0,
        important_note: false,
        _items: [],
        _hinweise: [],
      });
    }
    const g = groups.get(key);
    g.menge += Number(item.menge || 0);
    g._items.push(item);
    if (item.important_note) g.important_note = true;
    if (item.hinweis) {
      for (const part of String(item.hinweis).split(/\n|(?:\s*[·•|]\s*)/)) {
        const t = part.trim();
        if (
          t &&
          !g._hinweise.some(
            (h) => normalizeHinweisForCompare(h) === normalizeHinweisForCompare(t)
          )
        ) {
          g._hinweise.push(t);
        }
      }
    }
  });
  return Array.from(groups.values()).map((g) => ({
    ...g,
    pos: uniqueSortedPositions(g._items).join(", "),
    hinweis: dedupeHinweisText(g._hinweise.join(" · ")),
  }));
}

function posValue(item) {
  const n = parseInt(String(item.pos ?? "").trim(), 10);
  return Number.isNaN(n) ? Infinity : n;
}

function compareByColumn(a, b, key) {
  if (key === "pos") return posValue(a) - posValue(b);
  if (key === "menge") return (Number(a.menge) || 0) - (Number(b.menge) || 0);
  if (key === "regal") return regalOrderIndex(a) - regalOrderIndex(b);
  return naturalCompare(a[key], b[key]);
}

function sortRows(items, sortKey, sortDir) {
  if (!sortKey) return sortByPosNumber([...items]);
  return [...items].sort(
    (a, b) =>
      (sortDir === "desc" ? -1 : 1) * compareByColumn(a, b, sortKey) || posValue(a) - posValue(b)
  );
}

function MontageTableHead({ toggleSort, arrow }) {
  return (
    <thead>
      <tr>
        <th className="sortableTh colPos" onClick={() => toggleSort("pos")}>Pos.{arrow("pos")}</th>
        <th className="sortableTh colMenge" onClick={() => toggleSort("menge")}>Menge{arrow("menge")}</th>
        <th className="sortableTh colBez" onClick={() => toggleSort("bezeichnung")}>Bezeichnung{arrow("bezeichnung")}</th>
        <th className="sortableTh colGr" onClick={() => toggleSort("groesse")}>Größe{arrow("groesse")}</th>
        <th className="sortableTh colLa" onClick={() => toggleSort("laenge")}>Länge{arrow("laenge")}</th>
        <th className="sortableTh colAus" onClick={() => toggleSort("oberflaeche")}>Ausführung{arrow("oberflaeche")}</th>
        <th className="sortableTh colRegal" onClick={() => toggleSort("regal")}>Regalfach{arrow("regal")}</th>
        <th className="colHinweis">Hinweis</th>
      </tr>
    </thead>
  );
}

function MontageRow({ item, idx }) {
  return (
    <tr>
      <td className="colPos">{item.pos || idx + 1}</td>
      <td className="colMenge">{item.menge}</td>
      <td className="colBez">{item.bezeichnung}</td>
      <td className="colGr">{item.groesse}</td>
      <td className="colLa">{item.laenge}</td>
      <td className="colAus">{item.oberflaeche}</td>
      <td className="colRegal">{getRegalPlatz(item)}</td>
      <td className={"colHinweis" + (item.important_note ? " importantNote" : "")}>
        {dedupeHinweisText(item.hinweis)}
      </td>
    </tr>
  );
}

function BauteilBlock({ bauteil, items, toggleSort, arrow }) {
  return (
    <div className="printBauteilSection">
      <h4>Bauteil: {bauteil}</h4>
      <table className="printMaterialTable">
        <MontageTableHead toggleSort={toggleSort} arrow={arrow} />
        <tbody>
          {items.map((i, idx) => (
            <MontageRow key={i.id} item={i} idx={idx} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Druck: Baugruppe → Bauteil in derselben Reihenfolge wie die Projektübersicht
 * (buildProjectStructure), nicht alphabetisch.
 */
export default function PrintView({ project, baugruppe, items, projectItems, structureRows }) {
  const [search, setSearch] = useState("");
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);

  const printSource = projectItems || items;

  const structure = useMemo(
    () => buildProjectStructure(project, printSource, structureRows || []),
    [project, printSource, structureRows]
  );

  const byBaugruppe = useMemo(() => {
    const enriched = printSource.map((i) => ({
      ...i,
      ...parseEinbauort(i.einbauort, project?.baugruppe),
    }));
    return groupBy(enriched, (i) => i.baugruppe || "");
  }, [printSource, project]);

  const searchActive = Boolean(String(search || "").trim());

  const blocks = useMemo(() => {
    return structure
      .map(({ baugruppe: bg, bauteile }) => {
        const bgItems = byBaugruppe[bg] || [];
        const aggregated = aggregateForPrint(bgItems, project);
        const filtered = filterBySearch(aggregated, search, (i) => [
          project?.nr,
          project?.name,
          bg,
          i.bauteil,
          i.pos,
          i.bezeichnung,
          i.groesse,
          i.laenge,
          i.oberflaeche,
          i.hinweis,
          getRegalPlatz(i),
          `Pos ${i.pos}`,
          `Pos. ${i.pos}`,
          ...sizeLengthSearchParts(i.groesse, i.laenge),
        ]);
        const byBauteil = groupBy(filtered, (i) => i.bauteil);
        // Bauteil-Reihenfolge wie in der Projektübersicht (structure.bauteile)
        const bauteilBlocks = bauteile
          .filter((bt) => byBauteil[bt]?.length)
          .map((bt) => ({
            bauteil: bt,
            items: sortRows(byBauteil[bt], sortKey, sortDir),
          }));
        const status = baugruppeStatus(bgItems);
        return { baugruppe: bg, status, bauteilBlocks };
      })
      .filter((b) => b.bauteilBlocks.length > 0);
  }, [structure, byBaugruppe, project, search, sortKey, sortDir]);

  return (
    <div className="card printArea">
      <div className="row noPrint">
        <button onClick={() => window.print()}>Drucken</button>
      </div>
      <div className="noPrint">
        <SearchField value={search} onChange={setSearch} />
        {searchActive && <p className="hint">Druckausgabe gefiltert</p>}
      </div>
      <h2>Befestigungsmaterial</h2>
      <p>
        {project.nr} {project.name} · {project.zeichnung}
      </p>
      {searchActive && <p className="printFilterHint">Druckausgabe gefiltert</p>}

      {blocks.length === 0 && <p>Keine Materialpositionen.</p>}
      {blocks.map(({ baugruppe: bg, status, bauteilBlocks }) => (
        <div key={bg} className="printBaugruppeSection">
          <h3>
            {status.emoji} {bg} <small>({status.label})</small>
          </h3>
          {bauteilBlocks.map(({ bauteil, items: btItems }) => (
            <BauteilBlock
              key={`${bg}|${bauteil}`}
              bauteil={bauteil}
              items={btItems}
              toggleSort={toggleSort}
              arrow={arrow}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
