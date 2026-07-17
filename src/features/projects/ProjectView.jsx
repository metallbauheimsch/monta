import ProjectHeader from "../../components/ProjectHeader";
import { projectStatus, baugruppeStatus } from "../../utils/helpers";
import { TAB_ORDER, TAB_LABELS, PC_ONLY_TABS } from "../../utils/tabs";
import TabContent from "./TabContent";

export default function ProjectView({
  project,
  baugruppe,
  bauteil,
  bauteilItems,
  baugruppeItems,
  projectItems,
  allItems,
  backToDetail,
  deviceMode,
  tab,
  setTab,
  addItem,
  updateItem,
  deleteItem,
}) {
  const visibleTabs = TAB_ORDER.filter((t) => deviceMode === "pc" || !PC_ONLY_TABS.includes(t));
  // Sprint 7: In der TB-Erfassung ist die eigentliche Arbeit die
  // Materialerfassung, nicht die Projektübersicht. Deshalb dort statt der
  // großen Projektkarte nur eine kleine Kontextzeile (Baugruppe/Bauteil im
  // Vordergrund, Projektname/-nummer klein). In allen anderen Reitern bleibt
  // die gewohnte Projektkarte mit Status/Fortschritt erhalten.
  const isTbTab = tab === "tb";
  // Sprint 7 Abschluss: dieselbe Status-Ampel wie in Prüfung/Lager/
  // Warenkorb/Druck, damit der Materialstatus in jeder Ansicht gleich
  // sichtbar ist (Punkt 5, "Materialstatus vereinheitlichen"). Sprint 7 -
  // Korrekturen aus Praxistest: wird direkt aus den Materialpositionen
  // berechnet (siehe helpers.js).
  const tbStatus = baugruppeStatus(baugruppeItems);

  return (
    <>
      <button className="ghost" onClick={backToDetail}>← Baugruppen &amp; Bauteile</button>
      {isTbTab ? (
        <p className="tbContext">
          {tbStatus.emoji} <b>Baugruppe: {baugruppe}</b> · <b>Bauteil: {bauteil}</b>
          <span className="tbContextProject"> · {project.nr} {project.name}</span>
        </p>
      ) : (
        <>
          <ProjectHeader project={project} status={projectStatus(project, allItems)} />
          <p className="breadcrumb">{baugruppe} <span className="sep">›</span> {bauteil}</p>
        </>
      )}
      <div className="tabs">
        {visibleTabs.map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      <TabContent
        tab={tab}
        deviceMode={deviceMode}
        project={project}
        baugruppe={baugruppe}
        bauteil={bauteil}
        bauteilItems={bauteilItems}
        baugruppeItems={baugruppeItems}
        projectItems={projectItems}
        addItem={addItem}
        updateItem={updateItem}
        deleteItem={deleteItem}
      />
    </>
  );
}
