import { useMemo, useState } from "react";
import { groupBy, baugruppeStatus } from "../../utils/helpers";
import { parseEinbauort, isBaugruppeRow } from "../../utils/structure";
import { filterBySearch, sizeLengthSearchParts } from "../../utils/textSearch";
import { isHvGarnitur } from "./fasteningRules";
import SearchField from "../../components/SearchField";
import CompletionCheckbox from "../../components/CompletionCheckbox";

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
  // HV-Garnituren und HV-Ausführung: vollständig außerhalb der Längenprüfung
  if (isHvGarnitur(item.bezeichnung)) return false;
  const ausf = String(item.oberflaeche || "").trim().toLowerCase();
  if (ausf === "hv") return false;
  return (
    Boolean(item.bezeichnung) &&
    Boolean(item.groesse) &&
    item._laenge !== null &&
    item.hinweis !== AUTO_HINWEIS
  );
}

function groupKey(item) {
  const ausfuehrung = String(item.oberflaeche || "").trim().toLowerCase();
  return `${item.bezeichnung.trim().toLowerCase()}|${item.groesse.trim().toLowerCase()}|${ausfuehrung}`;
}

function findSimilarPairs(items) {
  const groups = groupBy(items, groupKey);
  const pairs = [];
  Object.values(groups).forEach((arr) => {
    const list = arr.filter(
      (i) => !isHvGarnitur(i.bezeichnung) && String(i.oberflaeche || "").trim().toLowerCase() !== "hv"
    );
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (lengthsAreSimilar(list[i]._laenge, list[j]._laenge)) {
          const pair = [list[i], list[j]].sort((a, b) => a._laenge - b._laenge);
          pairs.push(pair);
        }
      }
    }
  });
  return pairs;
}

export default function Checks({
  items,
  baugruppe,
  project,
  structureRows,
  setBaugruppeCompletion,
}) {
  const [search, setSearch] = useState("");

  const candidates = useMemo(() => {
    const base = items
      .map((i) => {
        const parsed = parseEinbauort(i.einbauort, project?.baugruppe);
        return {
          ...i,
          ...parsed,
          _laenge: parseLength(i.laenge),
        };
      })
      .filter(isCheckable);
    return filterBySearch(base, search, (i) => [
      project?.nr,
      project?.name,
      i.pos,
      i.baugruppe,
      i.bauteil,
      i.bezeichnung,
      i.groesse,
      i.laenge,
      i.oberflaeche,
      i.hinweis,
      i.important_note ? "wichtig" : "",
      `Pos ${i.pos}`,
      `Pos. ${i.pos}`,
      ...sizeLengthSearchParts(i.groesse, i.laenge),
    ]);
  }, [items, project, search]);

  const warnings = findSimilarPairs(candidates);
  const status = baugruppeStatus(items);

  const bgRow = baugruppe
    ? (structureRows || []).find(
        (r) =>
          String(r.project_id) === String(project?.id) &&
          r.baugruppe === baugruppe &&
          isBaugruppeRow(r)
      )
    : null;
  const tbDone = Boolean(bgRow?.tb_pruefung_abgeschlossen);

  return (
    <div className="card">
      <h2>
        Prüfung · gesamtes Projekt
        <span className="statusPill" title={status.label}>
          {" "}
          {status.emoji} {status.label}
        </span>
      </h2>
      {baugruppe && setBaugruppeCompletion && (
        <CompletionCheckbox
          label={`TB / Prüfung abgeschlossen · ${baugruppe}`}
          checked={tbDone}
          onToggle={(next) =>
            setBaugruppeCompletion(project.id, baugruppe, "tb_pruefung_abgeschlossen", next)
          }
          confirmMessage="TB und Prüfung für diese Baugruppe als abgeschlossen markieren?"
        />
      )}
      <SearchField value={search} onChange={setSearch} />
      <p className="hint">
        Projektweite Prüfung: gleiche Bezeichnung, Größe und Ausführung mit Längenabweichung bis 20 mm.
        HV-Garnituren und automatisch ergänzte Positionen werden nicht geprüft.
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
                {i.baugruppe ? ` · ${i.baugruppe}` : ""} · {i.bauteil}
                {i.hinweis ? (
                  <>
                    {" · "}
                    <span className={i.important_note ? "importantNote" : undefined}>{i.hinweis}</span>
                  </>
                ) : null}
              </p>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
