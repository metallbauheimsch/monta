import { useRef, useState } from "react";
import ProjectHeader from "../../components/ProjectHeader";
import { projectStatus, baugruppeStatus } from "../../utils/helpers";
import { buildProjectStructure, addBaugruppeToRegistry, addBauteilToRegistry, parseEinbauort } from "../../utils/structure";

// Projektseite: Baugruppen sind reine Ordnungsblöcke, direkt darunter die
// Bauteile. Klick auf ein Bauteil öffnet die Arbeitsansicht (Reiter).
//
// Sprint 5 Erweiterung #4/#5: jede Baugruppe zeigt zusätzlich ihre
// Materialstatus-Ampel (🔴 Offen / 🟡 Bestellt / 🟢 Bereit).
//
// Sprint 6 Ergänzung #11: Baugruppen und Bauteile können umbenannt werden
// (einfaches Inline-Formular statt Dialog, siehe unten).
// Sprint 6 Ergänzung #12: Ein neues Projekt legt keine Baugruppe automatisch
// an - ist die Liste leer, bleibt einfach nur das Anlegen-Formular übrig
// (Sprint 7: der zusätzliche große Button darüber wurde entfernt, da er
// gegenüber Eingabefeld + "Anlegen" überflüssig war).
// Sprint 7: "Baugruppe löschen" ist jetzt ein kleiner Button direkt neben
// "Umbenennen" statt einer großen Gefahrenzone am Kartenende.
// Sprint 7 Abschluss: Button-Beschriftung "+ Baugruppe" -> "Anlegen", damit
// die Bedienung identisch zur Bauteil-Anlage ist (gleicher Button-Text).
export default function ProjectDetail({
  project,
  items,
  setView,
  openBauteil,
  setProjectArchived,
  deleteProject,
  deleteBaugruppe,
  renameBaugruppe,
  renameBauteil,
}) {
  const [newBaugruppe, setNewBaugruppe] = useState("");
  const [addingBauteilTo, setAddingBauteilTo] = useState(null);
  const [newBauteil, setNewBauteil] = useState("");
  const [renamingBaugruppe, setRenamingBaugruppe] = useState(null);
  const [renameBaugruppeValue, setRenameBaugruppeValue] = useState("");
  const [renamingBauteil, setRenamingBauteil] = useState(null); // { baugruppe, bauteil }
  const [renameBauteilValue, setRenameBauteilValue] = useState("");
  const newBaugruppeInputRef = useRef(null);

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

  async function handleDeleteProject() {
    if (!confirm("Projekt wirklich dauerhaft löschen?")) return;
    try {
      // Bei Erfolg setzt App.jsx projectId/Baugruppe/Bauteil zurück und
      // zeigt die Projektübersicht (auch wenn es das letzte Projekt war).
      await deleteProject(project.id);
    } catch {
      // Fehler bereits in deleteProject gemeldet; Ansicht bleibt geöffnet.
    }
  }

  // Baugruppe löschen ist bewusst nur nach ausdrücklicher Bestätigung
  // möglich und funktioniert auch, wenn die Baugruppe bereits Material
  // enthält. Andere Baugruppen/Projekte bleiben unberührt (siehe
  // App.jsx deleteBaugruppe).
  async function handleDeleteBaugruppe(baugruppeName) {
    const ok = confirm(
      "Baugruppe wirklich löschen? Alle enthaltenen Bauteile und Materialpositionen werden dauerhaft gelöscht."
    );
    if (!ok) return;
    try {
      await deleteBaugruppe?.(project.id, baugruppeName);
    } catch {
      // Fehler bereits in deleteBaugruppe gemeldet.
    }
  }

  function startRenameBaugruppe(name) {
    setRenamingBaugruppe(name);
    setRenameBaugruppeValue(name);
  }

  function submitRenameBaugruppe(e, oldName) {
    e.preventDefault();
    const clean = renameBaugruppeValue.trim();
    if (!clean) return;
    renameBaugruppe?.(project.id, oldName, clean);
    setRenamingBaugruppe(null);
  }

  function startRenameBauteil(baugruppeName, bauteilName) {
    setRenamingBauteil({ baugruppe: baugruppeName, bauteil: bauteilName });
    setRenameBauteilValue(bauteilName);
  }

  function submitRenameBauteil(e, baugruppeName, oldName) {
    e.preventDefault();
    const clean = renameBauteilValue.trim();
    if (!clean) return;
    renameBauteil?.(project.id, baugruppeName, oldName, clean);
    setRenamingBauteil(null);
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
