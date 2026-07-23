import { useEffect, useRef, useState } from "react";
import ProjectHeader from "../../components/ProjectHeader";
import { projectStatus, baugruppeStatus } from "../../utils/helpers";
import { buildProjectStructure, parseEinbauort } from "../../utils/structure";

const LONG_PRESS_MS = 600;
const MOVE_CANCEL_PX = 10;

/**
 * Bauteil-Kontextmenü (Desktop: Rechtsklick, Mobil: Long Press).
 * Position: Desktop Maus, Mobil Finger.
 */
function BauteilContextMenu({ x, y, onClose, onRename, onDuplicate, onDelete }) {
  const menuRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    function onPointer(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [onClose]);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - rect.width - 8);
    }
    if (top + rect.height > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - rect.height - 8);
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="bauteilContextMenu"
      style={{ left: x, top: y }}
      role="menu"
    >
      <button type="button" role="menuitem" onClick={onRename}>
        Umbenennen
      </button>
      <button type="button" role="menuitem" onClick={onDuplicate}>
        Duplizieren
      </button>
      <button type="button" role="menuitem" className="dangerItem" onClick={onDelete}>
        Löschen
      </button>
    </div>
  );
}

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
  duplicateBauteil,
}) {
  const [newBaugruppe, setNewBaugruppe] = useState("");
  const [addingBauteilTo, setAddingBauteilTo] = useState(null);
  const [newBauteil, setNewBauteil] = useState("");
  const [renamingBaugruppe, setRenamingBaugruppe] = useState(null);
  const [renameBaugruppeValue, setRenameBaugruppeValue] = useState("");
  /** @type {[{ baugruppe: string, bauteil: string, x: number, y: number } | null, Function]} */
  const [menu, setMenu] = useState(null);
  /** @type {[{ mode: 'rename'|'duplicate', baugruppe: string, bauteil: string, value: string } | null, Function]} */
  const [dialog, setDialog] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const newBaugruppeInputRef = useRef(null);
  const suppressClickRef = useRef(false);
  const longPressRef = useRef(null);

  const structure = buildProjectStructure(project, items, structureRows);

  function clearLongPress() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  }

  function openMenu(baugruppe, bauteil, x, y) {
    setMenu({ baugruppe, bauteil, x, y });
  }

  function closeMenu() {
    setMenu(null);
  }

  function handleBauteilClick(baugruppe, bauteil) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    closeMenu();
    openBauteil(baugruppe, bauteil);
  }

  function handleContextMenu(e, baugruppe, bauteil) {
    e.preventDefault();
    e.stopPropagation();
    clearLongPress();
    openMenu(baugruppe, bauteil, e.clientX, e.clientY);
  }

  function handlePointerDown(e, baugruppe, bauteil) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    clearLongPress();
    const startX = e.clientX;
    const startY = e.clientY;
    longPressRef.current = {
      baugruppe,
      bauteil,
      startX,
      startY,
      timer: setTimeout(() => {
        longPressRef.current = null;
        suppressClickRef.current = true;
        openMenu(baugruppe, bauteil, startX, startY);
      }, LONG_PRESS_MS),
    };
  }

  function handlePointerMove(e) {
    const lp = longPressRef.current;
    if (!lp) return;
    const dx = Math.abs(e.clientX - lp.startX);
    const dy = Math.abs(e.clientY - lp.startY);
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearLongPress();
  }

  function handlePointerUp() {
    clearLongPress();
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
      if (menu?.baugruppe === baugruppeName) closeMenu();
      if (dialog?.baugruppe === baugruppeName) setDialog(null);
    } catch { /* gemeldet */ }
  }

  function startRenameBaugruppe(name) {
    setRenamingBaugruppe(name);
    setRenameBaugruppeValue(name);
    closeMenu();
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
    if (!menu) return;
    const { baugruppe, bauteil } = menu;
    closeMenu();
    setDialog({ mode: "rename", baugruppe, bauteil, value: bauteil });
  }

  function startDuplicateFromMenu() {
    if (!menu) return;
    const { baugruppe, bauteil } = menu;
    closeMenu();
    setDialog({ mode: "duplicate", baugruppe, bauteil, value: "" });
  }

  async function handleDeleteFromMenu() {
    if (!menu) return;
    const { baugruppe, bauteil } = menu;
    closeMenu();
    const ok = confirm(
      `Bauteil „${bauteil}“ wirklich löschen? Zugehörige Materialpositionen werden dauerhaft gelöscht.`
    );
    if (!ok) return;
    try {
      await deleteBauteil?.(project.id, baugruppe, bauteil);
    } catch { /* gemeldet */ }
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
                {baugruppe}{" "}
                <span className="statusPill" title={status.label}>
                  {status.emoji} {status.label}
                </span>
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
              {bauteile.length === 0 && (
                <p className="hint">Noch keine Bauteile angelegt.</p>
              )}
              {bauteile.map((bt) => (
                <button
                  key={bt}
                  type="button"
                  className="chip bauteilChip"
                  onClick={() => handleBauteilClick(baugruppe, bt)}
                  onContextMenu={(e) => handleContextMenu(e, baugruppe, bt)}
                  onPointerDown={(e) => handlePointerDown(e, baugruppe, bt)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={handlePointerUp}
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

      {menu && (
        <BauteilContextMenu
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
          onRename={startRenameFromMenu}
          onDuplicate={startDuplicateFromMenu}
          onDelete={handleDeleteFromMenu}
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
