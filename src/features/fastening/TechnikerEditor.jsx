import { useMemo, useRef, useState } from "react";
import { ausfuehrungen, groessen } from "./constants";
import { getDescriptionOptions, rememberDescriptionIfNew } from "./descriptionsRegistry";
import { allocatePositions } from "./technikerUtils";
import {
  applyAutoTorqueHinweis,
  isHvGarnitur,
  normalizeHvDesignation,
  dedupeHinweisText,
  buildMitlaufItems,
  getUnavailableFinishHint,
} from "./fasteningRules";
import { formatEinbauort } from "../../utils/structure";
import { naturalCompare, useSortableColumns } from "../../utils/sorting";
import { filterBySearch, sizeLengthSearchParts } from "../../utils/textSearch";
import SearchField from "../../components/SearchField";
import SuggestionAutocomplete from "./SuggestionAutocomplete";

const emptyFields = {
  menge: "",
  bezeichnung: "",
  groesse: "",
  laenge: "",
  oberflaeche: "galvanisch",
  hinweis: "",
  important_note: false,
};

function posValue(item) {
  const n = parseInt(String(item.pos ?? "").trim(), 10);
  return Number.isNaN(n) ? Infinity : n;
}

function compareByColumn(a, b, key) {
  // important_note niemals Sortierschlüssel
  if (key === "important_note") return 0;
  if (key === "pos" || key === "menge") return (Number(a[key]) || 0) - (Number(b[key]) || 0);
  return naturalCompare(a[key], b[key]);
}

/** Stabile Reihenfolge: gewählte Spalte, sonst Pos.; Tie-Break pos → id. */
function stableSortItems(items, sortKey, sortDir) {
  const dir = sortDir === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    let primary = 0;
    if (sortKey) primary = dir * compareByColumn(a, b, sortKey);
    else primary = posValue(a) - posValue(b);
    if (primary !== 0) return primary;
    const byPos = posValue(a) - posValue(b);
    if (byPos !== 0) return byPos;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function prepareFields(bezeichnung, groesse, hinweis) {
  const bez = normalizeHvDesignation(bezeichnung);
  const note = dedupeHinweisText(applyAutoTorqueHinweis(hinweis, bez, groesse));
  return { bezeichnung: bez, hinweis: note };
}

export default function TechnikerEditor({
  items,
  allProjectItems,
  addItem,
  updateItem,
  deleteItem,
  baugruppe,
  bauteil,
  project,
}) {
  const [draft, setDraft] = useState(() => ({ ...emptyFields, autoMitlauf: true }));
  const [search, setSearch] = useState("");
  const mengeRef = useRef(null);
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);
  const descriptionOptions = getDescriptionOptions();

  const filteredItems = useMemo(
    () =>
      filterBySearch(items, search, (i) => [
        project?.nr,
        project?.name,
        i.pos,
        baugruppe,
        bauteil,
        i.bezeichnung,
        i.groesse,
        i.laenge,
        i.oberflaeche,
        i.hinweis,
        i.important_note ? "wichtig" : "",
        `Pos ${i.pos}`,
        `Pos. ${i.pos}`,
        ...sizeLengthSearchParts(i.groesse, i.laenge),
      ]),
    [items, search, baugruppe, bauteil, project]
  );

  const sortedItems = useMemo(
    () => stableSortItems(filteredItems, sortKey, sortDir),
    [filteredItems, sortKey, sortDir]
  );

  function set(k, v) {
    setDraft((d) => {
      const next = { ...d, [k]: v };
      if (k === "bezeichnung" || k === "groesse") {
        const bez = k === "bezeichnung" ? normalizeHvDesignation(v) : normalizeHvDesignation(d.bezeichnung);
        const gr = k === "groesse" ? v : d.groesse;
        if (k === "bezeichnung" && isHvGarnitur(v)) next.bezeichnung = bez;
        next.hinweis = applyAutoTorqueHinweis(k === "hinweis" ? v : d.hinweis, bez, gr);
      }
      return next;
    });
  }

  function focusFirstField() {
    requestAnimationFrame(() => mengeRef.current?.focus());
  }

  function patchItem(id, patch) {
    const current = items.find((x) => x.id === id);
    if (!current) {
      updateItem(id, patch);
      return;
    }
    let next = { ...patch };
    const bezIn = patch.bezeichnung !== undefined ? patch.bezeichnung : current.bezeichnung;
    const grIn = patch.groesse !== undefined ? patch.groesse : current.groesse;
    const hinIn = patch.hinweis !== undefined ? patch.hinweis : current.hinweis;
    const ausfIn = patch.oberflaeche !== undefined ? patch.oberflaeche : current.oberflaeche;
    if (
      patch.bezeichnung !== undefined ||
      patch.groesse !== undefined ||
      patch.hinweis !== undefined
    ) {
      const prepared = prepareFields(bezIn, grIn, hinIn);
      if (patch.bezeichnung !== undefined || isHvGarnitur(bezIn)) {
        next.bezeichnung = prepared.bezeichnung;
      }
      next.hinweis = prepared.hinweis;
    }
    if (patch.bezeichnung !== undefined || patch.oberflaeche !== undefined) {
      const warn = getUnavailableFinishHint(
        next.bezeichnung !== undefined ? next.bezeichnung : bezIn,
        ausfIn
      );
      if (warn) {
        // Nur Hinweis – keine automatische Korrektur von Werkstoff/Artikel
        alert(warn);
      }
    }
    updateItem(id, next);
  }

  async function submit(e) {
    e.preventDefault();
    const einbauort = formatEinbauort(baugruppe, bauteil);
    const posBasis = allProjectItems || items;
    const menge = Number(draft.menge || 0);
    const prepared = prepareFields(draft.bezeichnung, draft.groesse, draft.hinweis);
    const companions = draft.autoMitlauf
      ? buildMitlaufItems(prepared.bezeichnung, {
          groesse: draft.groesse,
          oberflaeche: draft.oberflaeche,
          menge,
        })
      : [];
    const [mainPos, ...companionPos] = allocatePositions(posBasis, 1 + companions.length);

    rememberDescriptionIfNew(prepared.bezeichnung);

    if (draft.important_note && !String(prepared.hinweis || "").trim()) {
      alert("Bitte zuerst einen Hinweis eintragen.");
      return;
    }

    try {
      await addItem({
        pos: mainPos,
        einbauort,
        menge,
        bezeichnung: prepared.bezeichnung,
        groesse: draft.groesse,
        laenge: draft.laenge,
        oberflaeche: draft.oberflaeche,
        hinweis: prepared.hinweis,
        important_note: Boolean(draft.important_note),
      });

      for (let idx = 0; idx < companions.length; idx += 1) {
        const c = companions[idx];
        await addItem({
          pos: companionPos[idx],
          einbauort,
          menge: c.menge,
          bezeichnung: c.bezeichnung,
          groesse: c.groesse,
          laenge: "",
          oberflaeche: c.oberflaeche,
          hinweis: "Automatisch ergänzt",
        });
      }
    } catch {
      return;
    }

    setDraft({ ...emptyFields, oberflaeche: draft.oberflaeche, autoMitlauf: draft.autoMitlauf });
    focusFirstField();
  }

  const finishHint = getUnavailableFinishHint(draft.bezeichnung, draft.oberflaeche);

  return (
    <>
      <div className="card pcOnly">
        <h2>TB-Erfassung</h2>
        <form className="entryGrid" onSubmit={submit}>
          <input
            ref={mengeRef}
            type="number"
            inputMode="numeric"
            placeholder="Menge"
            value={draft.menge}
            onChange={(e) => set("menge", e.target.value)}
            required
          />
          <SuggestionAutocomplete
            value={draft.bezeichnung}
            onChange={(v) => set("bezeichnung", v)}
            onCommit={rememberDescriptionIfNew}
            options={descriptionOptions}
            placeholder="Bezeichnung"
            required
          />
          <SuggestionAutocomplete
            value={draft.groesse}
            onChange={(v) => set("groesse", v)}
            options={groessen}
            placeholder="Größe"
          />
          <input
            placeholder="Länge"
            value={draft.laenge}
            onChange={(e) => set("laenge", e.target.value)}
          />
          <SuggestionAutocomplete
            value={draft.oberflaeche}
            onChange={(v) => set("oberflaeche", v)}
            options={ausfuehrungen}
            placeholder="Ausführung"
          />
          <input
            placeholder="Hinweis / Drehmoment"
            value={draft.hinweis}
            onChange={(e) => set("hinweis", e.target.value)}
          />
          <label className="checkboxLine entryImportantNote" title="Wichtiger Hinweis">
            <input
              type="checkbox"
              checked={Boolean(draft.important_note)}
              onChange={(e) => {
                if (e.target.checked && !String(draft.hinweis || "").trim()) {
                  alert("Bitte zuerst einen Hinweis eintragen.");
                  return;
                }
                set("important_note", e.target.checked);
              }}
            />
            Wichtig
          </label>
          <button>+ Eintragen</button>
        </form>
        {finishHint && <p className="authError finishHint">{finishHint}</p>}
        <label className="checkboxLine">
          <input
            type="checkbox"
            checked={draft.autoMitlauf}
            onChange={(e) => set("autoMitlauf", e.target.checked)}
          />
          U-Scheibe/Mutter automatisch ergänzen
        </label>
      </div>

      <div className="card">
        <h2>Erfasste Positionen{bauteil ? ` · ${bauteil}` : ""}</h2>
        <SearchField value={search} onChange={setSearch} />
        <div className="tableWrap">
          <table className="editTable">
            <tbody>
              <tr>
                <th className="sortableTh" onClick={() => toggleSort("pos")}>
                  Pos.{arrow("pos")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("menge")}>
                  Menge{arrow("menge")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("bezeichnung")}>
                  Bezeichnung{arrow("bezeichnung")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("groesse")}>
                  Größe{arrow("groesse")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("laenge")}>
                  Länge{arrow("laenge")}
                </th>
                <th className="sortableTh" onClick={() => toggleSort("oberflaeche")}>
                  Ausführung{arrow("oberflaeche")}
                </th>
                <th>Hinweis</th>
                <th title="Wichtiger Hinweis">Wichtig</th>
                <th></th>
              </tr>
              {sortedItems.map((i) => (
                <tr key={i.id}>
                  <td className="posCell">{i.pos}</td>
                  <td>
                    <input
                      type="number"
                      value={i.menge || 0}
                      onChange={(e) => patchItem(i.id, { menge: Number(e.target.value) })}
                    />
                  </td>
                  <td className="suggestionCell">
                    <SuggestionAutocomplete
                      value={i.bezeichnung || ""}
                      onChange={(v) => patchItem(i.id, { bezeichnung: v })}
                      onCommit={rememberDescriptionIfNew}
                      options={descriptionOptions}
                      placeholder="Bezeichnung"
                      ellipsis
                    />
                  </td>
                  <td>
                    <input
                      value={i.groesse || ""}
                      onChange={(e) => patchItem(i.id, { groesse: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={i.laenge || ""}
                      onChange={(e) => patchItem(i.id, { laenge: e.target.value })}
                    />
                  </td>
                  <td className="suggestionCell">
                    <SuggestionAutocomplete
                      value={i.oberflaeche || ""}
                      onChange={(v) => patchItem(i.id, { oberflaeche: v })}
                      options={ausfuehrungen}
                      placeholder="Ausführung"
                      ellipsis
                    />
                  </td>
                  <td>
                    <input
                      className={i.important_note ? "importantNoteInput" : ""}
                      value={i.hinweis || ""}
                      onChange={(e) => patchItem(i.id, { hinweis: e.target.value })}
                      onBlur={(e) => {
                        const cleaned = dedupeHinweisText(e.target.value);
                        if (cleaned !== String(i.hinweis || "")) {
                          patchItem(i.id, { hinweis: cleaned });
                        }
                      }}
                    />
                  </td>
                  <td
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(i.important_note)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked && !String(i.hinweis || "").trim()) {
                          alert("Bitte zuerst einen Hinweis eintragen.");
                          return;
                        }
                        // Nur important_note – keine Sortierung, kein Hinweis-Rewrite
                        updateItem(i.id, { important_note: e.target.checked });
                      }}
                      title="Wichtiger Hinweis"
                    />
                  </td>
                  <td>
                    <button type="button" className="ghost" onClick={() => deleteItem(i.id)}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
