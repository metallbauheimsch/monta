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
  structureRows,
  backToDetail,
  isNarrow,
  fullModuleAccess,
  tab,
  setTab,
  addItem,
  updateItem,
  deleteItem,
  setBaugruppeCompletion,
}) {
  const visibleTabs = visibleTabsFor(isNarrow, { fullAccess: fullModuleAccess });

  useEffect(() => {
    if (!visibleTabs.includes(tab)) {
      setTab(visibleTabs.includes("material") ? "material" : visibleTabs[0]);
    }
  }, [visibleTabs, tab, setTab]);

  const isTbTab = tab === "tb";
  const tbStatus = baugruppeStatus(baugruppeItems);

  return (
    <>
      <button className="ghost" onClick={backToDetail}>
        ← Baugruppen &amp; Bauteile
      </button>
      {isTbTab ? (
        <p className="tbContext">
          {tbStatus.emoji} <b>Baugruppe: {baugruppe}</b>
          {" "}
          · <b>Bauteil: {bauteil}</b>
          <span className="tbContextProject">
            {" "}
            · {project.nr} {project.name}
          </span>
        </p>
      ) : (
        <>
          <ProjectHeader project={project} status={projectStatus(project, allItems)} />
          <p className="breadcrumb">
            {baugruppe}
            <span className="sep">›</span>
            {bauteil}
          </p>
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
        structureRows={structureRows}
        addItem={addItem}
        updateItem={updateItem}
        deleteItem={deleteItem}
        setBaugruppeCompletion={setBaugruppeCompletion}
      />
    </>
  );
}
