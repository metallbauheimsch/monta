import { useRef, useState } from "react";
import ProjectHeader from "../../components/ProjectHeader";
import EntityContextMenu from "../../components/EntityContextMenu";
import { projectStatus, baugruppeStatus } from "../../utils/helpers";
import { buildProjectStructure, parseEinbauort } from "../../utils/structure";
import { useContextMenuGesture } from "../../utils/contextMenuGesture";
import { TAB_LABELS, projectWideTabsFor } from "../../utils/tabs";

export default function ProjectDetail({
  project,
  items,
  structureRows,
  setView,
  openBauteil,
  openProjectWide,
  isNarrow,
  fullModuleAccess,
  setProjectArchived,
  deleteProject,
  addBaugruppe,
  addBauteil,
  deleteBaugruppe,
  deleteBauteil,
  renameBaugruppe,
  renameBauteil,
  duplicateBauteil,
}) {
  const [newBaugruppe, setNewBaugruppe] = useState("");
  const [addingBauteilTo, setAddingBauteilTo] = useState(null);
  const [newBauteil, setNewBauteil] = useState("");
  const [renamingBaugruppe, setRenamingBaugruppe] = useState(null);
  const [renameBaugruppeValue, setRenameBaugruppeValue] = useState("");
  /** @type {[{ mode: 'rename'|'duplicate', baugruppe: string, bauteil: string, value: string } | null, Function]} */
  const [dialog, setDialog] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const newBaugruppeInputRef = useRef(null);

  // Zwei unabhängige Kontextmenüs (Rechtsklick/Long Press) über dieselbe
  // wiederverwendbare Gestenlogik - eines für Bauteil-Chips (Umbenennen/
  // Duplizieren/Löschen), eines für Baugruppen-Überschriften (Umbenennen/
  // Löschen). Keine zweite, abweichende Architektur.
  const bauteilMenu = useContextMenuGesture();
  const baugruppeMenu = useContextMenuGesture();

  const structure = buildProjectStructure(project, items, structureRows);
  const projectWideTabs = projectWideTabsFor(isNarrow, { fullAccess: fullModuleAccess });

  function handleBauteilClick(baugruppe, bauteil) {
    if (bauteilMenu.consumeSuppressedClick()) return;
    bauteilMenu.closeMenu();
    openBauteil(baugruppe, bauteil);
  }

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
      if (bauteilMenu.menu?.target?.baugruppe === baugruppeName) bauteilMenu.closeMenu();
      if (baugruppeMenu.menu?.target?.baugruppe === baugruppeName) baugruppeMenu.closeMenu();
      if (dialog?.baugruppe === baugruppeName) setDialog(null);
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

  function startRenameFromMenu() {
    if (!bauteilMenu.menu) return;
    const { baugruppe, bauteil } = bauteilMenu.menu.target;
    bauteilMenu.closeMenu();
    setDialog({ mode: "rename", baugruppe, bauteil, value: bauteil });
  }

  function startDuplicateFromMenu() {
    if (!bauteilMenu.menu) return;
    const { baugruppe, bauteil } = bauteilMenu.menu.target;
    bauteilMenu.closeMenu();
    setDialog({ mode: "duplicate", baugruppe, bauteil, value: "" });
  }

  async function handleDeleteFromMenu() {
    if (!bauteilMenu.menu) return;
    const { baugruppe, bauteil } = bauteilMenu.menu.target;
    bauteilMenu.closeMenu();
    const ok = confirm(
      `Bauteil „${bauteil}“ wirklich löschen? Zugehörige Materialpositionen werden dauerhaft gelöscht.`
    );
    if (!ok) return;
    try {
      await deleteBauteil?.(project.id, baugruppe, bauteil);
    } catch { /* gemeldet */ }
  }

  function startRenameBaugruppeFromMenu() {
    if (!baugruppeMenu.menu) return;
    const { baugruppe } = baugruppeMenu.menu.target;
    baugruppeMenu.closeMenu();
    startRenameBaugruppe(baugruppe);
  }

  async function deleteBaugruppeFromMenu() {
    if (!baugruppeMenu.menu) return;
    const { baugruppe } = baugruppeMenu.menu.target;
    baugruppeMenu.closeMenu();
    await handleDeleteBaugruppe(baugruppe);
  }

  async function submitDialog(e) {
    e.preventDefault();
    if (!dialog) return;
    const clean = dialog.value.trim();
    if (!clean) {
      alert("Bitte einen Namen eingeben.");
      return;
    }
    setDialogBusy(true);
    try {
      if (dialog.mode === "rename") {
        await renameBauteil?.(project.id, dialog.baugruppe, dialog.bauteil, clean);
      } else if (dialog.mode === "duplicate") {
        await duplicateBauteil?.(project.id, dialog.baugruppe, dialog.bauteil, clean);
      }
      setDialog(null);
    } catch { /* gemeldet */ }
    finally {
      setDialogBusy(false);
    }
  }

  return (
    <>
      <button className="ghost" onClick={() => setView("projects")}>← Projekte</button>
      <ProjectHeader project={project} status={projectStatus(project, items)} />

      {openProjectWide && projectWideTabs.length > 0 && (
        <div className="tabs projectWideNav">
          {projectWideTabs.map((t) => (
            <button key={t} type="button" onClick={() => openProjectWide(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      )}

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
              <h3 className="baugruppeHead">
                <button
                  type="button"
                  className="baugruppeTitleBtn"
                  onContextMenu={(e) => baugruppeMenu.handleContextMenu(e, { baugruppe })}
                  onPointerDown={(e) => baugruppeMenu.handlePointerDown(e, { baugruppe })}
                  onPointerMove={baugruppeMenu.handlePointerMove}
                  onPointerUp={baugruppeMenu.handlePointerUp}
                  onPointerCancel={baugruppeMenu.handlePointerUp}
                  onPointerLeave={baugruppeMenu.handlePointerUp}
                  onKeyDown={(e) => baugruppeMenu.handleKeyDown(e, { baugruppe })}
                >
                  {baugruppe}
                </button>{" "}
                <span className="statusPill" title={status.label}>
                  {status.emoji} {status.label}
                </span>
              </h3>
            )}

            <div className="chipRow">
              {bauteile.length === 0 && (
                <p className="hint">Noch keine Bauteile angelegt.</p>
              )}
              {bauteile.map((bt) => (
                <button
                  key={bt}
                  type="button"
                  className="chip bauteilChip"
                  onClick={() => handleBauteilClick(baugruppe, bt)}
                  onContextMenu={(e) => bauteilMenu.handleContextMenu(e, { baugruppe, bauteil: bt })}
                  onPointerDown={(e) => bauteilMenu.handlePointerDown(e, { baugruppe, bauteil: bt })}
                  onPointerMove={bauteilMenu.handlePointerMove}
                  onPointerUp={bauteilMenu.handlePointerUp}
                  onPointerCancel={bauteilMenu.handlePointerUp}
                  onPointerLeave={bauteilMenu.handlePointerUp}
                >
                  {bt}
                </button>
              ))}
            </div>

            {addingBauteilTo === baugruppe ? (
              <form className="inlineForm" onSubmit={(e) => handleAddBauteil(baugruppe, e)}>
                <input
                  autoFocus
                  placeholder="Bauteilname (z. B. Stütze S1)"
                  value={newBauteil}
                  onChange={(e) => setNewBauteil(e.target.value)}
                />
                <button>Anlegen</button>
                <button type="button" className="ghost" onClick={() => setAddingBauteilTo(null)}>
                  Abbrechen
                </button>
              </form>
            ) : (
              <button className="ghost" onClick={() => setAddingBauteilTo(baugruppe)}>
                + Bauteil
              </button>
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
          <button className="ghost" onClick={() => setProjectArchived(project.id, false)}>
            Aus Archiv zurückholen
          </button>
        ) : (
          <button className="ghost" onClick={() => setProjectArchived(project.id, true)}>
            Projekt archivieren
          </button>
        )}
      </div>

      <div className="card dangerZone">
        <h3>Gefahrenbereich</h3>
        <p className="hint">
          Löscht das Projekt und alle zugehörigen Materialpositionen unwiderruflich.
        </p>
        <button className="danger" onClick={handleDeleteProject}>
          Projekt löschen
        </button>
      </div>

      {bauteilMenu.menu && (
        <EntityContextMenu
          x={bauteilMenu.menu.x}
          y={bauteilMenu.menu.y}
          onClose={bauteilMenu.closeMenu}
          items={[
            { label: "Umbenennen", onClick: startRenameFromMenu },
            { label: "Duplizieren", onClick: startDuplicateFromMenu },
            { label: "Löschen", onClick: handleDeleteFromMenu, danger: true },
          ]}
        />
      )}

      {baugruppeMenu.menu && (
        <EntityContextMenu
          x={baugruppeMenu.menu.x}
          y={baugruppeMenu.menu.y}
          onClose={baugruppeMenu.closeMenu}
          items={[
            { label: "Umbenennen", onClick: startRenameBaugruppeFromMenu },
            { label: "Löschen", onClick: deleteBaugruppeFromMenu, danger: true },
          ]}
        />
      )}

      {dialog && (
        <div className="bauteilDialogBackdrop" onClick={() => !dialogBusy && setDialog(null)}>
          <form
            className="bauteilDialog card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitDialog}
          >
            <label className="hint">
              {dialog.mode === "rename"
                ? `Neuer Name für „${dialog.bauteil}“`
                : `Name der Kopie von „${dialog.bauteil}“`}
            </label>
            <input
              autoFocus
              value={dialog.value}
              onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
              placeholder={dialog.mode === "duplicate" ? "z. B. S2" : dialog.bauteil}
              required
              disabled={dialogBusy}
            />
            <div className="inlineForm">
              <button type="submit" disabled={dialogBusy}>
                {dialogBusy
                  ? "…"
                  : dialog.mode === "rename"
                    ? "Umbenennen"
                    : "Duplizieren"}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={dialogBusy}
                onClick={() => setDialog(null)}
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
