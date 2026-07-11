import ProjectHeader from "../../components/ProjectHeader";
import { projectStatus } from "../../utils/helpers";
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
  isBaugruppeBestellt,
  setBaugruppeBestellt,
}) {
  const visibleTabs = TAB_ORDER.filter((t) => deviceMode === "pc" || !PC_ONLY_TABS.includes(t));

  return (
    <>
      <button className="ghost" onClick={backToDetail}>← Baugruppen &amp; Bauteile</button>
      <ProjectHeader project={project} status={projectStatus(project, allItems)} />
      <p className="breadcrumb">{baugruppe} <span className="sep">›</span> {bauteil}</p>
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
        isBaugruppeBestellt={isBaugruppeBestellt}
        setBaugruppeBestellt={setBaugruppeBestellt}
      />
    </>
  );
}
