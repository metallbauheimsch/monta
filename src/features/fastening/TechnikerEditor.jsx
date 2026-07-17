import { useMemo, useRef, useState } from "react";
import { ausfuehrungen, groessen } from "./constants";
import { getDescriptionOptions, rememberDescriptionIfNew } from "./descriptionsRegistry";
import { allocatePositions, getMitlaufartikel } from "./technikerUtils";
import { formatEinbauort } from "../../utils/structure";
import { naturalCompare, useSortableColumns } from "../../utils/sorting";
import SuggestionAutocomplete from "./SuggestionAutocomplete";

const emptyFields = { menge: "", bezeichnung: "", groesse: "", laenge: "", oberflaeche: "galvanisch", hinweis: "" };

// items: Materialpositionen des aktuell geöffneten Bauteils (Anzeige/Bearbeitung)
// allProjectItems: alle Positionen des Projekts (nur zur Vergabe einer projektweit eindeutigen Positionsnummer)
// Sprint 7: Spaltenüberschriften der erfassten Positionen sind anklickbar
// und sortieren die Tabelle (numerisch korrekt, siehe utils/sorting.js).
// Ohne aktive Sortierung bleibt die bisherige Reihenfolge erhalten.
function compareByColumn(a, b, key) {
  if (key === "pos" || key === "menge") return (Number(a[key]) || 0) - (Number(b[key]) || 0);
  return naturalCompare(a[key], b[key]);
}

export default function TechnikerEditor({ items, allProjectItems, addItem, updateItem, deleteItem, baugruppe, bauteil }) {
  const [draft, setDraft] = useState(() => ({ ...emptyFields, autoMitlauf: true }));
  const mengeRef = useRef(null);
  const { sortKey, sortDir, toggleSort, arrow } = useSortableColumns(null);
  // Startliste + bisher gemerkte Bezeichnungen; wird bei jedem Render neu
  // gelesen, damit frisch gemerkte Vorschläge sofort verfügbar sind.
  const descriptionOptions = getDescriptionOptions();

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    const sorted = [...items].sort((a, b) => compareByColumn(a, b, sortKey));
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [items, sortKey, sortDir]);

  function set(k, v) { setDraft((d) => ({ ...d, [k]: v })); }

  function focusFirstField() {
    requestAnimationFrame(() => mengeRef.current?.focus());
  }

  async function submit(e) {
    e.preventDefault();
    const einbauort = formatEinbauort(baugruppe, bauteil);
    const posBasis = allProjectItems || items;
    const menge = Number(draft.menge || 0);
    const companions = draft.autoMitlauf ? getMitlaufartikel(draft.bezeichnung) : [];
    const [mainPos, ...companionPos] = allocatePositions(posBasis, 1 + companions.length);

    rememberDescriptionIfNew(draft.bezeichnung);

    try {
      await addItem({
        pos: mainPos,
        einbauort,
        menge,
        bezeichnung: draft.bezeichnung,
        groesse: draft.groesse,
        laenge: draft.laenge,
        oberflaeche: draft.oberflaeche,
        hinweis: draft.hinweis,
      });

      for (let idx = 0; idx < companions.length; idx += 1) {
        const c = companions[idx];
        await addItem({
          pos: companionPos[idx],
          einbauort,
          menge: menge * c.faktor,
          bezeichnung: c.bezeichnung,
          groesse: draft.groesse,
          laenge: "",
          oberflaeche: draft.oberflaeche,
          hinweis: "Automatisch ergänzt",
        });
      }
    } catch {
      // Eingaben behalten - addItem hat den Fehler bereits angezeigt.
      return;
    }

    setDraft({ ...emptyFields, oberflaeche: draft.oberflaeche, autoMitlauf: draft.autoMitlauf });
    focusFirstField();
  }

  return (
    <>
      <div className="card pcOnly">
        <h2>TB-Erfassung</h2>
        <form className="entryGrid" onSubmit={submit}>
          <input ref={mengeRef} type="number" inputMode="numeric" placeholder="Menge" value={draft.menge} onChange={(e) => set("menge", e.target.value)} required />
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
          <input placeholder="Länge" value={draft.laenge} onChange={(e) => set("laenge", e.target.value)} />
          <SuggestionAutocomplete
            value={draft.oberflaeche}
            onChange={(v) => set("oberflaeche", v)}
            options={ausfuehrungen}
            placeholder="Ausführung"
          />
          <input placeholder="Hinweis / Drehmoment" value={draft.hinweis} onChange={(e) => set("hinweis", e.target.value)} />
          <button>+ Eintragen</button>
        </form>
        <label className="checkboxLine">
          <input
            type="checkbox"
            checked={draft.autoMitlauf}
            onChange={(e) => set("autoMitlauf", e.target.checked)}
          />
          U-Scheiben/Sechskantmuttern automatisch ergänzen
        </label>
      </div>

      <div className="card">
        <h2>Erfasste Positionen{bauteil ? ` · ${bauteil}` : ""}</h2>
        <div className="tableWrap">
          <table className="editTable">
            <tbody>
              <tr>
                <th className="sortableTh" onClick={() => toggleSort("pos")}>Pos.{arrow("pos")}</th>
                <th className="sortableTh" onClick={() => toggleSort("menge")}>Menge{arrow("menge")}</th>
                <th className="sortableTh" onClick={() => toggleSort("bezeichnung")}>Bezeichnung{arrow("bezeichnung")}</th>
                <th className="sortableTh" onClick={() => toggleSort("groesse")}>Größe{arrow("groesse")}</th>
                <th className="sortableTh" onClick={() => toggleSort("laenge")}>Länge{arrow("laenge")}</th>
                <th className="sortableTh" onClick={() => toggleSort("oberflaeche")}>Ausführung{arrow("oberflaeche")}</th>
                <th>Hinweis</th>
                <th></th>
              </tr>
              {sortedItems.map((i) => (
                <tr key={i.id}>
                  {/* Positionsnummer nur zur Anzeige - wird automatisch vergeben
                      (siehe technikerUtils.allocatePositions) und ist hier bewusst
                      nicht editierbar, um doppelte/widersprüchliche Nummern zu
                      vermeiden. Sprint 6: macht Positionen in der Prüfungsansicht
                      eindeutig unterscheidbar. */}
                  <td className="posCell">{i.pos}</td>
                  <td><input type="number" value={i.menge || 0} onChange={(e) => updateItem(i.id, { menge: Number(e.target.value) })} /></td>
                  <td className="suggestionCell">
                    <SuggestionAutocomplete
                      value={i.bezeichnung || ""}
                      onChange={(v) => updateItem(i.id, { bezeichnung: v })}
                      onCommit={rememberDescriptionIfNew}
                      options={descriptionOptions}
                      placeholder="Bezeichnung"
                      ellipsis
                    />
                  </td>
                  <td><input value={i.groesse || ""} onChange={(e) => updateItem(i.id, { groesse: e.target.value })} /></td>
                  <td><input value={i.laenge || ""} onChange={(e) => updateItem(i.id, { laenge: e.target.value })} /></td>
                  <td className="suggestionCell">
                    <SuggestionAutocomplete
                      value={i.oberflaeche || ""}
                      onChange={(v) => updateItem(i.id, { oberflaeche: v })}
                      options={ausfuehrungen}
                      placeholder="Ausführung"
                      ellipsis
                    />
                  </td>
                  <td><input value={i.hinweis || ""} onChange={(e) => updateItem(i.id, { hinweis: e.target.value })} /></td>
                  <td><button className="danger" onClick={() => deleteItem(i.id)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
