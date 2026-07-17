import { projectStatus, baugruppeStatus } from "../../utils/helpers";
import { buildProjectStructure, parseEinbauort } from "../../utils/structure";

// Sprint 5 Erweiterung #4: zeigt in der Projektübersicht zusätzlich zum
// bestehenden Gesamtfortschritt eine kompakte Zusammenfassung der
// Baugruppen-Ampeln (🔴/🟡/🟢) je Projekt. Sprint 7 - Korrekturen aus
// Praxistest: baugruppeStatus wird direkt aus den Materialpositionen
// berechnet (kein manuelles Häkchen mehr, siehe helpers.js).
function baugruppenSummary(project, items) {
  const structure = buildProjectStructure(project, items);
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

export default function ProjectsList({ projects, items, setView, setProjectId }) {
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

  return (
    <>
      <div className="top">
        <h2>Projekte</h2>
        <button onClick={() => setView("newProject")}>Neues Projekt</button>
      </div>
      <p className="hint">Erfassung am PC. Workflow-Bearbeitung mobil oder am Tablet.</p>
      {projects.map((p) => {
        const s = projectStatus(p, items);
        const projectItems = items.filter((i) => i.project_id === p.id);
        const bg = baugruppenSummary(p, projectItems);
        return (
          <div className="card clickable" key={p.id} onClick={() => { setProjectId(p.id); setView("projectDetail"); }}>
            <div className="row">
              <div>
                <h3>{p.nr} {p.name}</h3>
                <p>{p.baugruppe || "Keine Baugruppe"}</p>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {p.archived && <span className="badge">Archiviert</span>}
                <span className={"badge " + s.cls}>{s.label}</span>
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
      })}
    </>
  );
}
