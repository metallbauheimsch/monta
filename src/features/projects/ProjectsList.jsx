import { projectStatus, baugruppeStatus } from "../../utils/helpers";
import { buildProjectStructure, parseEinbauort } from "../../utils/structure";
import {
  ACTIVE_SORT_DIR_LABELS,
  ACTIVE_SORT_MODES,
  DEFAULT_ACTIVE_SORT,
  DEFAULT_ACTIVE_SORT_DIR,
  isArchiveToggleVisible,
  sortActiveProjects,
  sortArchivedProjects,
  splitProjects,
  toggleSortDir,
} from "./projectSorting";

// Sprint 5 Erweiterung #4: zeigt in der Projektübersicht zusätzlich zum
// bestehenden Gesamtfortschritt eine kompakte Zusammenfassung der
// Baugruppen-Ampeln (🔴/🟡/🟢) je Projekt. Sprint 7 - Korrekturen aus
// Praxistest: baugruppeStatus wird direkt aus den Materialpositionen
// berechnet (kein manuelles Häkchen mehr, siehe helpers.js).
function baugruppenSummary(project, items, structureRows) {
  const structure = buildProjectStructure(project, items, structureRows);
  const counts = { offen: 0, bestellt: 0, bereit: 0 };
  structure.forEach(({ baugruppe }) => {
    const bgItems = items.filter(
      (i) => parseEinbauort(i.einbauort, project?.baugruppe).baugruppe === baugruppe
    );
    const status = baugruppeStatus(bgItems);
    if (status.key in counts) counts[status.key] += 1;
  });
  return counts;
}

function ProjectCard({ project: p, items, structureRows, onOpen }) {
  const s = projectStatus(p, items);
  const projectItems = items.filter((i) => i.project_id === p.id);
  const bg = baugruppenSummary(p, projectItems, structureRows);
  return (
    <div className="card clickable" onClick={() => onOpen(p.id)}>
      <div className="row">
        <div>
          <h3>{p.nr} {p.name}</h3>
          <p>{p.baugruppe || "Keine Baugruppe"}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {p.archived && <span className="badge">Archiviert</span>}
          <span className={"badge " + s.cls}>{s.emoji} {s.label}</span>
        </div>
      </div>
      <div className="progress"><div style={{ width: `${s.pct}%` }} /></div>
      <small>{s.pct}% vollständig</small>
      {(bg.offen + bg.bestellt + bg.bereit) > 0 && (
        <div className="baugruppenAmpelRow">
          {bg.offen > 0 && <span>🔴 {bg.offen}</span>}
          {bg.bestellt > 0 && <span>🟡 {bg.bestellt}</span>}
          {bg.bereit > 0 && <span>🟢 {bg.bereit}</span>}
        </div>
      )}
    </div>
  );
}

// Sprint 1: aktive Projekte (sortierbar, Standard "Nach Status") und - nur
// wenn eingeblendet - archivierte Projekte in einem eigenen Abschnitt
// darunter (A–Z / Z–A). Beide Listen nutzen dieselbe Projektkarte und
// dieselbe Öffnen-Aktion wie bisher.
export default function ProjectsList({
  projects,
  items,
  structureRows,
  setView,
  setProjectId,
  showArchived,
  onToggleArchived,
  sortMode = DEFAULT_ACTIVE_SORT,
  onSortModeChange,
  sortDir = DEFAULT_ACTIVE_SORT_DIR,
  onSortDirChange,
  archiveSortDir = "asc",
  onArchiveSortDirChange,
}) {
  if (projects.length === 0) {
    return (
      <>
        <div className="top">
          <h2>Projekte</h2>
        </div>
        <div className="card emptyProjectsCard">
          <p>Noch kein Projekt vorhanden.</p>
          <button onClick={() => setView("newProject")}>Neues Projekt</button>
        </div>
      </>
    );
  }

  const openProject = (id) => {
    setProjectId(id);
    setView("projectDetail");
  };
  const { active, archived } = splitProjects(projects);
  const sortedActive = sortActiveProjects(active, items, sortMode, sortDir);
  const sortedArchived = sortArchivedProjects(archived, archiveSortDir);

  return (
    <>
      <div className="top">
        <h2>Projekte</h2>
        <button onClick={() => setView("newProject")}>Neues Projekt</button>
      </div>
      <div className="projectSort">
        <label>
          Sortieren
          <select value={sortMode} onChange={(e) => onSortModeChange?.(e.target.value)}>
            {ACTIVE_SORT_MODES.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="ghost sortDirBtn"
          onClick={() => onSortDirChange?.(toggleSortDir(sortDir))}
          title="Sortierrichtung umkehren"
        >
          {ACTIVE_SORT_DIR_LABELS[sortMode]?.[sortDir] || ACTIVE_SORT_DIR_LABELS.status.asc}
        </button>
      </div>
      {sortedActive.length === 0 && <p className="hint">Keine aktiven Projekte.</p>}
      {sortedActive.map((p) => (
        <ProjectCard key={p.id} project={p} items={items} structureRows={structureRows} onOpen={openProject} />
      ))}
      {isArchiveToggleVisible(projects) && (
        <button style={{ marginTop: 12 }} onClick={onToggleArchived}>
          {showArchived ? "Archiv ausblenden" : "Archiv anzeigen"}
        </button>
      )}
      {showArchived && (
        <section className="archiveSection">
          <div className="top">
            <h2>Archivierte Projekte</h2>
            <button
              type="button"
              className="ghost archiveSortBtn"
              onClick={() => onArchiveSortDirChange?.(toggleSortDir(archiveSortDir))}
              title="Sortierrichtung umkehren"
            >
              {archiveSortDir === "desc" ? "Z–A ↓" : "A–Z ↑"}
            </button>
          </div>
          {sortedArchived.length === 0 && <p className="hint">Keine archivierten Projekte.</p>}
          {sortedArchived.map((p) => (
            <ProjectCard key={p.id} project={p} items={items} structureRows={structureRows} onOpen={openProject} />
          ))}
        </section>
      )}
    </>
  );
}
