export default function ProjectHeader({ project, status }) {
  return (
    <div className="card">
      <div className="row">
        <div><h2>{project.nr} {project.name}</h2><p>{project.baugruppe} · {project.zeichnung}</p></div>
        <span className={"badge " + status.cls}>{status.label}</span>
      </div>
      <div className="progress"><div style={{ width: `${status.pct}%` }} /></div>
      <small>{status.pct}% vollständig</small>
    </div>
  );
}
