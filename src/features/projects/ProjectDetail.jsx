import { useRef, useState } from "react";
import ProjectHeader from "../../components/ProjectHeader";
import { projectStatus, baugruppeStatus } from "../../utils/helpers";
import { buildProjectStructure, parseEinbauort } from "../../utils/structure";

// Projektseite: Baugruppen/Bauteile aus project_structure (Supabase),
// ergänzt um Materialpositionen. Anlegen/Umbenennen/Löschen synchronisiert.
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
}) {
  const [newBaugruppe, setNewBaugruppe] = useState("");
  const [addingBauteilTo, setAddingBauteilTo] = useState(null);
  const [newBauteil, setNewBauteil] = useState("");
  const [renamingBaugruppe, setRenamingBaugruppe] = useState(null);
  const [renameBaugruppeValue, setRenameBaugruppeValue] = useState("");
  const [renamingBauteil, setRenamingBauteil] = useState(null);
  const [renameBauteilValue, setRenameBauteilValue] = useState("");
  const newBaugruppeInputRef = useRef(null);

  const structure = buildProjectStructure(project, items, structureRows);

  async function handleAddBaugruppe(e) {
    e.preventDefault();
    if (!newBaugruppe.trim()) return;
    try {
      await addBaugruppe?.(project.id, newBaugruppe.trim());
      setNewBaugruppe("");
    } catch {
      // Fehler bereits gemeldet
    }
  }

  async function handleAddBauteil(baugruppeName, e) {
    e.preventDefault();
    if (!newBauteil.trim()) return;
    try {
      await addBauteil?.(project.id, baugruppeName, newBauteil.trim());
      setNewBauteil("");
      setAddingBauteilTo(null);
    } catch {
      // Fehler bereits gemeldet
    }
  }

  async function handleDeleteProject() {
    if (!confirm("Projekt wirklich dauerhaft löschen?")) return;
    try {
      await deleteProject(project.id);
    } catch {
      // Fehler bereits gemeldet
    }
  }

  async function handleDeleteBaugruppe(baugruppeName) {
    const ok = confirm(
      "Baugruppe wirklich löschen? Alle enthaltenen Bauteile und Materialpositionen werden dauerhaft gelöscht."
    );
    if (!ok) return;
    try {
      await deleteBaugruppe?.(project.id, baugruppeName);
    } catch {
      // Fehler bereits gemeldet
    }
  }

  async function handleDeleteBauteil(baugruppeName, bauteilName) {
    const ok = confirm(
      "Bauteil wirklich löschen? Zugehörige Materialpositionen werden dauerhaft gelöscht."
    );
    if (!ok) return;
    try {
      await deleteBauteil?.(project.id, baugruppeName, bauteilName);
    } catch {
      // Fehler bereits gemeldet
    }
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
    } catch {
      // Fehler bereits gemeldet
    }
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
    } catch {
      // Fehler bereits gemeldet
    }
  }

  return (
    <>
      <button className="ghost" onClick={() => setView("projects")}>← Projekte</button>
      <ProjectHeader project={project} status={projectStatus(project, items)} />

      <h3>Baugruppen &amp; Bauteile</h3>

      {structure.map(({ baugruppe, bauteile }) => {
        const baugruppeItems = items.filter(
          (i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe === baugruppe
        );
        const status = baugruppeStatus(baugruppeItems);
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
            <div className="chipRow">
              {bauteile.length === 0 && <p className="hint">Noch keine Bauteile angelegt.</p>}
              {bauteile.map((bauteil) => {
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
              })}
            </div>
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
