import { useEffect } from "react";
import ProjectHeader from "../../components/ProjectHeader";
import { projectStatus, baugruppeStatus } from "../../utils/helpers";
import { TAB_LABELS, visibleTabsFor } from "../../utils/tabs";
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
  isNarrow,
  tab,
  setTab,
  addItem,
  updateItem,
  deleteItem,
}) {
  const visibleTabs = visibleTabsFor(isNarrow);

  // Wenn die Ansicht schmal wird und der aktuelle Reiter (z. B. TB) dort
  // nicht sichtbar ist, auf den ersten verfügbaren Reiter wechseln.
  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab(visibleTabs[0] || "material");
  }, [visibleTabs, tab, setTab]);

  // Sprint 7: In der TB-Erfassung ist die eigentliche Arbeit die
  // Materialerfassung, nicht die Projektübersicht. Deshalb dort statt der
  // großen Projektkarte nur eine kleine Kontextzeile (Baugruppe/Bauteil im
  // Vordergrund, Projektname/-nummer klein). In allen anderen Reitern bleibt
  // die gewohnte Projektkarte mit Status/Fortschritt erhalten.
  const isTbTab = tab === "tb";
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
