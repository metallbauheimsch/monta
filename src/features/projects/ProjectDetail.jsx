import { useState } from "react";
import ProjectHeader from "../../components/ProjectHeader";
import { projectStatus, baugruppeStatus } from "../../utils/helpers";
import { buildProjectStructure, addBaugruppeToRegistry, addBauteilToRegistry, parseEinbauort } from "../../utils/structure";

// Projektseite: Baugruppen sind reine Ordnungsblöcke, direkt darunter die
// Bauteile. Klick auf ein Bauteil öffnet die Arbeitsansicht (Reiter).
//
// Sprint 5 Erweiterung #4/#5: jede Baugruppe zeigt zusätzlich ihre
// Materialstatus-Ampel (🔴 Offen / 🟡 Bestellt / 🟢 Bereit).
export default function ProjectDetail({
  project,
  items,
  setView,
  openBauteil,
  setProjectArchived,
  deleteProject,
  isBaugruppeBestellt,
}) {
  const [newBaugruppe, setNewBaugruppe] = useState("");
  const [addingBauteilTo, setAddingBauteilTo] = useState(null);
  const [newBauteil, setNewBauteil] = useState("");

  const structure = buildProjectStructure(project, items);

  function handleAddBaugruppe(e) {
    e.preventDefault();
    if (!newBaugruppe.trim()) return;
    addBaugruppeToRegistry(project.id, newBaugruppe.trim());
    setNewBaugruppe(""); // triggert Re-Render, buildProjectStructure liest Registry neu
  }

  function handleAddBauteil(baugruppeName, e) {
    e.preventDefault();
    if (!newBauteil.trim()) return;
    addBauteilToRegistry(project.id, baugruppeName, newBauteil.trim());
    setNewBauteil("");
    setAddingBauteilTo(null);
  }

  function handleDeleteProject() {
    if (!confirm("Projekt wirklich dauerhaft löschen?")) return;
    deleteProject(project.id);
    setView("projects");
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
        const status = baugruppeStatus(baugruppeItems, isBaugruppeBestellt?.(project.id, baugruppe));
        return (
          <div className="card" key={baugruppe}>
            <h3>
              {baugruppe} <span className="statusPill" title={status.label}>{status.emoji} {status.label}</span>
            </h3>
            <div className="chipRow">
              {bauteile.length === 0 && <p className="hint">Noch keine Bauteile angelegt.</p>}
              {bauteile.map((bauteil) => (
                <button key={bauteil} className="chip" onClick={() => openBauteil(baugruppe, bauteil)}>
                  {bauteil}
                </button>
              ))}
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
        <input placeholder="Neue Baugruppe (z. B. Pergola)" value={newBaugruppe} onChange={(e) => setNewBaugruppe(e.target.value)} />
        <button>+ Baugruppe</button>
      </form>

      {/* Bewusst unauffällig und am Seitenende: Archivieren ist eine normale,
          reversible Aktion, Löschen ist unwiderruflich - beide daher klar
          getrennt und nicht prominent oben platziert. */}
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
