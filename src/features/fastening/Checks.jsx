import { useMemo, useState } from "react";
import { groupBy, baugruppeStatus } from "../../utils/helpers";
import { parseEinbauort, getBauteilgruppe } from "../../utils/structure";
import { filterBySearch } from "../../utils/textSearch";
import SearchField from "../../components/SearchField";

const LENGTH_TOLERANCE_MM = 20;
const AUTO_HINWEIS = "Automatisch ergänzt";

function parseLength(value) {
  const n = parseFloat(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function lengthsAreSimilar(a, b) {
  if (a === b) return false;
  return Math.abs(a - b) <= LENGTH_TOLERANCE_MM;
}

function isCheckable(item) {
  return Boolean(item.bezeichnung) && Boolean(item.groesse) && item._laenge !== null && item.hinweis !== AUTO_HINWEIS;
}

function groupKey(item) {
  const ausfuehrung = String(item.oberflaeche || "").trim().toLowerCase();
  return `${item.bezeichnung.trim().toLowerCase()}|${item.groesse.trim().toLowerCase()}|${ausfuehrung}`;
}

function findSimilarPairs(items) {
  const groups = groupBy(items, groupKey);
  const pairs = [];
  Object.values(groups).forEach((arr) => {
    for (let i = 0; i < arr.length; i += 1) {
      for (let j = i + 1; j < arr.length; j += 1) {
        if (lengthsAreSimilar(arr[i]._laenge, arr[j]._laenge)) {
          const pair = [arr[i], arr[j]].sort((a, b) => a._laenge - b._laenge);
          pairs.push(pair);
        }
      }
    }
  });
  return pairs;
}

export default function Checks({ items, baugruppe, project, structureRows }) {
  const [search, setSearch] = useState("");

  const candidates = useMemo(() => {
    const base = items
      .map((i) => {
        const parsed = parseEinbauort(i.einbauort, project?.baugruppe);
        return {
          ...i,
          ...parsed,
          bauteilgruppe: getBauteilgruppe(structureRows, project?.id, parsed.baugruppe, parsed.bauteil),
          _laenge: parseLength(i.laenge),
        };
      })
      .filter(isCheckable);
    return filterBySearch(base, search, (i) => [
      i.pos,
      i.baugruppe,
      i.bauteilgruppe,
      i.bauteil,
      i.bezeichnung,
      i.groesse,
      i.laenge,
      i.oberflaeche,
      i.hinweis,
    ]);
  }, [items, project, structureRows, search]);

  const warnings = findSimilarPairs(candidates);
  const status = baugruppeStatus(items);

  return (
    <div className="card">
      <h2>
        Prüfung{baugruppe ? ` · ${baugruppe}` : ""}
        {baugruppe && <span className="statusPill" title={status.label}> {status.emoji} {status.label}</span>}
      </h2>
      <SearchField value={search} onChange={setSearch} />
      <p className="hint">
        Findet Befestigungsmittel mit gleicher Bezeichnung, Größe und Ausführung, deren Länge um maximal 20 mm abweicht.
        Automatisch ergänzte Positionen werden nicht berücksichtigt.
      </p>
      {warnings.length === 0 ? (
        <p>Keine Auffälligkeiten gefunden.</p>
      ) : (
        warnings.map((pair, idx) => (
          <div className="line" key={idx}>
            <b>Ähnliche Längen prüfen</b>
            {pair.map((i) => (
              <p key={i.id}>
                Pos. {i.pos} · {i.menge} × {i.bezeichnung} {i.groesse}×{i.laenge}
                {i.bauteilgruppe ? ` · ${i.bauteilgruppe}` : ""} · {i.bauteil}
              </p>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
