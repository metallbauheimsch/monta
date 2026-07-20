import { useRef, useState } from "react";
import ProjectHeader from "../../components/ProjectHeader";
import { projectStatus, baugruppeStatus } from "../../utils/helpers";
import { buildProjectStructure, parseEinbauort, UNGROUPED_LABEL } from "../../utils/structure";

export default function ProjectDetail({
  project,
  items,
  structureRows,
  setView,
  openBauteil,
  setProjectArchived,
  deleteProject,
  addBaugruppe,
  addBauteil,
  deleteBaugruppe,
  deleteBauteil,
  renameBaugruppe,
  renameBauteil,
  groupBauteile,
  renameBauteilgruppe,
  setBauteileInGruppe,
  dissolveBauteilgruppe,
}) {
  const [newBaugruppe, setNewBaugruppe] = useState("");
  const [addingBauteilTo, setAddingBauteilTo] = useState(null);
  const [newBauteil, setNewBauteil] = useState("");
  const [renamingBaugruppe, setRenamingBaugruppe] = useState(null);
  const [renameBaugruppeValue, setRenameBaugruppeValue] = useState("");
  const [renamingBauteil, setRenamingBauteil] = useState(null);
  const [renameBauteilValue, setRenameBauteilValue] = useState("");
  const [groupingFor, setGroupingFor] = useState(null); // baugruppe name
  const [groupName, setGroupName] = useState("");
  const [groupSelected, setGroupSelected] = useState([]);
  const [editingGroup, setEditingGroup] = useState(null); // { baugruppe, bauteilgruppe }
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupMembers, setEditGroupMembers] = useState([]);
  const newBaugruppeInputRef = useRef(null);

  const structure = buildProjectStructure(project, items, structureRows);

  async function handleAddBaugruppe(e) {
    e.preventDefault();
    if (!newBaugruppe.trim()) return;
    try {
      await addBaugruppe?.(project.id, newBaugruppe.trim());
      setNewBaugruppe("");
    } catch { /* gemeldet */ }
  }

  async function handleAddBauteil(baugruppeName, e) {
    e.preventDefault();
    if (!newBauteil.trim()) return;
    try {
      await addBauteil?.(project.id, baugruppeName, newBauteil.trim());
      setNewBauteil("");
      setAddingBauteilTo(null);
    } catch { /* gemeldet */ }
  }

  async function handleDeleteProject() {
    if (!confirm("Projekt wirklich dauerhaft löschen?")) return;
    try {
      await deleteProject(project.id);
    } catch { /* gemeldet */ }
  }

  async function handleDeleteBaugruppe(baugruppeName) {
    const ok = confirm(
      "Baugruppe wirklich löschen? Alle enthaltenen Bauteile und Materialpositionen werden dauerhaft gelöscht."
    );
    if (!ok) return;
    try {
      await deleteBaugruppe?.(project.id, baugruppeName);
    } catch { /* gemeldet */ }
  }

  async function handleDeleteBauteil(baugruppeName, bauteilName) {
    const ok = confirm(
      "Bauteil wirklich löschen? Zugehörige Materialpositionen werden dauerhaft gelöscht."
    );
    if (!ok) return;
    try {
      await deleteBauteil?.(project.id, baugruppeName, bauteilName);
    } catch { /* gemeldet */ }
  }

  function startRenameBaugruppe(name) {
    setRenamingBaugruppe(name);
    setRenameBaugruppeValue(name);
  }

  async function submitRenameBaugruppe(e, oldName) {
    e.preventDefault();
    const clean = renameBaugruppeValue.trim();
    if (!clean) return;
    try {
      await renameBaugruppe?.(project.id, oldName, clean);
      setRenamingBaugruppe(null);
    } catch { /* gemeldet */ }
  }

  function startRenameBauteil(baugruppeName, bauteilName) {
    setRenamingBauteil({ baugruppe: baugruppeName, bauteil: bauteilName });
    setRenameBauteilValue(bauteilName);
  }

  async function submitRenameBauteil(e, baugruppeName, oldName) {
    e.preventDefault();
    const clean = renameBauteilValue.trim();
    if (!clean) return;
    try {
      await renameBauteil?.(project.id, baugruppeName, oldName, clean);
      setRenamingBauteil(null);
    } catch { /* gemeldet */ }
  }

  function startGrouping(baugruppeName) {
    setGroupingFor(baugruppeName);
    setGroupName("");
    setGroupSelected([]);
    setEditingGroup(null);
  }

  function toggleGroupSelect(bt) {
    setGroupSelected((prev) =>
      prev.includes(bt) ? prev.filter((x) => x !== bt) : [...prev, bt]
    );
  }

  async function submitGrouping(e) {
    e.preventDefault();
    try {
      await groupBauteile?.(project.id, groupingFor, groupSelected, groupName);
      setGroupingFor(null);
      setGroupName("");
      setGroupSelected([]);
    } catch { /* gemeldet */ }
  }

  function startEditGroup(baugruppeName, section) {
    if (section.ungrouped || !section.bauteilgruppe) return;
    setEditingGroup({ baugruppe: baugruppeName, bauteilgruppe: section.bauteilgruppe });
    setEditGroupName(section.bauteilgruppe);
    setEditGroupMembers([...section.bauteile]);
    setGroupingFor(null);
  }

  function toggleEditMember(bt) {
    setEditGroupMembers((prev) =>
      prev.includes(bt) ? prev.filter((x) => x !== bt) : [...prev, bt]
    );
  }

  async function submitEditGroup(e, allBauteile) {
    e.preventDefault();
    if (!editingGroup) return;
    try {
      if (editGroupName.trim() !== editingGroup.bauteilgruppe) {
        await renameBauteilgruppe?.(
          project.id,
          editingGroup.baugruppe,
          editingGroup.bauteilgruppe,
          editGroupName.trim()
        );
      }
      await setBauteileInGruppe?.(
        project.id,
        editingGroup.baugruppe,
        editGroupName.trim() || editingGroup.bauteilgruppe,
        editGroupMembers
      );
      setEditingGroup(null);
    } catch { /* gemeldet */ }
  }

  async function handleDissolve(baugruppeName, groupName) {
    const ok = confirm(
      "Bauteilgruppe wirklich auflösen? Die Bauteile und Materialpositionen bleiben erhalten."
    );
    if (!ok) return;
    try {
      await dissolveBauteilgruppe?.(project.id, baugruppeName, groupName);
      setEditingGroup(null);
    } catch { /* gemeldet */ }
  }

  function renderBauteilChip(baugruppe, bauteil) {
    const isRenaming =
      renamingBauteil &&
      renamingBauteil.baugruppe === baugruppe &&
      renamingBauteil.bauteil === bauteil;
    if (isRenaming) {
      return (
        <form
          key={bauteil}
          className="inlineForm chipInlineForm"
          onSubmit={(e) => submitRenameBauteil(e, baugruppe, bauteil)}
        >
          <input
            autoFocus
            value={renameBauteilValue}
            onChange={(e) => setRenameBauteilValue(e.target.value)}
          />
          <button>Speichern</button>
          <button type="button" className="ghost" onClick={() => setRenamingBauteil(null)}>
            Abbrechen
          </button>
        </form>
      );
    }
    return (
      <span className="chipWithEdit" key={bauteil}>
        <button className="chip" onClick={() => openBauteil(baugruppe, bauteil)}>
          {bauteil}
        </button>
        <button
          type="button"
          className="ghost chipEdit"
          title="Bauteil umbenennen"
          onClick={() => startRenameBauteil(baugruppe, bauteil)}
        >
          ✎
        </button>
        <button
          type="button"
          className="ghost chipEdit dangerBtnSmall"
          title="Bauteil löschen"
          onClick={() => handleDeleteBauteil(baugruppe, bauteil)}
        >
          ×
        </button>
      </span>
    );
  }

  return (
    <>
      <button className="ghost" onClick={() => setView("projects")}>← Projekte</button>
      <ProjectHeader project={project} status={projectStatus(project, items)} />

      <h3>Baugruppen &amp; Bauteile</h3>

      {structure.map(({ baugruppe, bauteile, sections }) => {
        const baugruppeItems = items.filter(
          (i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe === baugruppe
        );
        const status = baugruppeStatus(baugruppeItems);
        const hasNamedGroups = sections.some((s) => s.bauteilgruppe && !s.ungrouped);

        return (
          <div className="card" key={baugruppe}>
            {renamingBaugruppe === baugruppe ? (
              <form className="inlineForm" onSubmit={(e) => submitRenameBaugruppe(e, baugruppe)}>
                <input
                  autoFocus
                  value={renameBaugruppeValue}
                  onChange={(e) => setRenameBaugruppeValue(e.target.value)}
                />
                <button>Speichern</button>
                <button type="button" className="ghost" onClick={() => setRenamingBaugruppe(null)}>
                  Abbrechen
                </button>
              </form>
            ) : (
              <h3>
                {baugruppe} <span className="statusPill" title={status.label}>{status.emoji} {status.label}</span>
                <button
                  type="button"
                  className="ghost renameBtn"
                  onClick={() => startRenameBaugruppe(baugruppe)}
                >
                  Umbenennen
                </button>
                <button
                  type="button"
                  className="ghost renameBtn dangerBtnSmall"
                  onClick={() => handleDeleteBaugruppe(baugruppe)}
                >
                  Löschen
                </button>
              </h3>
            )}

            {sections.map((section) => {
              const label = section.bauteilgruppe;
              const showLabel = hasNamedGroups || (label && !section.ungrouped);
              const isEditing =
                editingGroup &&
                editingGroup.baugruppe === baugruppe &&
                editingGroup.bauteilgruppe === section.bauteilgruppe;

              if (isEditing) {
                return (
                  <div className="bauteilgruppeBlock" key={`${baugruppe}|edit|${section.bauteilgruppe}`}>
                    <form className="form" onSubmit={(e) => submitEditGroup(e, bauteile)}>
                      <label className="hint">Bauteilgruppe umbenennen / Mitglieder</label>
                      <input
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        placeholder="Gruppenname"
                        required
                      />
                      <div className="chipRow">
                        {bauteile.map((bt) => (
                          <label key={bt} className="checkboxLine">
                            <input
                              type="checkbox"
                              checked={editGroupMembers.includes(bt)}
                              onChange={() => toggleEditMember(bt)}
                            />
                            {bt}
                          </label>
                        ))}
                      </div>
                      <div className="inlineForm">
                        <button type="submit">Speichern</button>
                        <button type="button" className="ghost" onClick={() => setEditingGroup(null)}>
                          Abbrechen
                        </button>
                        <button
                          type="button"
                          className="ghost dangerBtnSmall"
                          onClick={() => handleDissolve(baugruppe, section.bauteilgruppe)}
                        >
                          Auflösen
                        </button>
                      </div>
                    </form>
                  </div>
                );
              }

              return (
                <div className="bauteilgruppeBlock" key={`${baugruppe}|${label || "flat"}`}>
                  {showLabel && label ? (
                    <div className="bauteilgruppeHead">
                      <h4>{label === UNGROUPED_LABEL ? UNGROUPED_LABEL : `Bauteilgruppe: ${label}`}</h4>
                      {!section.ungrouped && (
                        <button
                          type="button"
                          className="ghost renameBtn"
                          onClick={() => startEditGroup(baugruppe, section)}
                        >
                          Bearbeiten
                        </button>
                      )}
                    </div>
                  ) : null}
                  <div className="chipRow">
                    {section.bauteile.length === 0 && (
                      <p className="hint">Noch keine Bauteile angelegt.</p>
                    )}
                    {section.bauteile.map((bt) => renderBauteilChip(baugruppe, bt))}
                  </div>
                </div>
              );
            })}

            {groupingFor === baugruppe ? (
              <form className="form bauteilgruppeForm" onSubmit={submitGrouping}>
                <h4>Bauteile gruppieren</h4>
                <input
                  autoFocus
                  placeholder="Name der Bauteilgruppe (z. B. Stützen)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
                <div className="chipRow">
                  {bauteile.map((bt) => (
                    <label key={bt} className="checkboxLine">
                      <input
                        type="checkbox"
                        checked={groupSelected.includes(bt)}
                        onChange={() => toggleGroupSelect(bt)}
                      />
                      {bt}
                    </label>
                  ))}
                </div>
                <div className="inlineForm">
                  <button type="submit">Gruppieren</button>
                  <button type="button" className="ghost" onClick={() => setGroupingFor(null)}>
                    Abbrechen
                  </button>
                </div>
              </form>
            ) : (
              bauteile.length >= 2 && (
                <button className="ghost" onClick={() => startGrouping(baugruppe)}>
                  Bauteile gruppieren
                </button>
              )
            )}

            {addingBauteilTo === baugruppe ? (
              <form className="inlineForm" onSubmit={(e) => handleAddBauteil(baugruppe, e)}>
                <input autoFocus placeholder="Bauteilname (z. B. Stütze S1)" value={newBauteil} onChange={(e) => setNewBauteil(e.target.value)} />
                <button>Anlegen</button>
                <button type="button" className="ghost" onClick={() => setAddingBauteilTo(null)}>Abbrechen</button>
              </form>
            ) : (
              <button className="ghost" onClick={() => setAddingBauteilTo(baugruppe)}>+ Bauteil</button>
            )}
          </div>
        );
      })}

      <form className="card inlineForm" onSubmit={handleAddBaugruppe}>
        <input
          ref={newBaugruppeInputRef}
          placeholder="Neue Baugruppe (z. B. Pergola)"
          value={newBaugruppe}
          onChange={(e) => setNewBaugruppe(e.target.value)}
        />
        <button>Anlegen</button>
      </form>

      <div className="card manageZone">
        <h3>Projekt verwalten</h3>
        {project.archived ? (
          <button className="ghost" onClick={() => setProjectArchived(project.id, false)}>Aus Archiv zurückholen</button>
        ) : (
          <button className="ghost" onClick={() => setProjectArchived(project.id, true)}>Projekt archivieren</button>
        )}
      </div>

      <div className="card dangerZone">
        <h3>Gefahrenbereich</h3>
        <p className="hint">Löscht das Projekt und alle zugehörigen Materialpositionen unwiderruflich.</p>
        <button className="danger" onClick={handleDeleteProject}>Projekt löschen</button>
      </div>
    </>
  );
}
