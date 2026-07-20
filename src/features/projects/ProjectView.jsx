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
  tab,
  setTab,
  addItem,
  updateItem,
  deleteItem,
}) {
  const visibleTabs = visibleTabsFor(isNarrow);

  // Wenn TB/Prüfung durch Viewport ausgeblendet werden: auf Lager wechseln.
  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab("material");
  }, [visibleTabs, tab, setTab]);

  const isTbTab = tab === "tb";
  const tbStatus = baugruppeStatus(baugruppeItems);
  const groupHint = (() => {
    if (!structureRows || !baugruppe || !bauteil) return null;
    const row = structureRows.find(
      (r) =>
        String(r.project_id) === String(project.id) &&
        r.baugruppe === baugruppe &&
        String(r.bauteil || "") === bauteil &&
        r.bauteilgruppe
    );
    return row?.bauteilgruppe || null;
  })();

  return (
    <>
      <button className="ghost" onClick={backToDetail}>← Baugruppen &amp; Bauteile</button>
      {isTbTab ? (
        <p className="tbContext">
          {tbStatus.emoji} <b>Baugruppe: {baugruppe}</b>
          {groupHint ? <> · <b>Gruppe: {groupHint}</b></> : null}
          {" "}· <b>Bauteil: {bauteil}</b>
          <span className="tbContextProject"> · {project.nr} {project.name}</span>
        </p>
      ) : (
        <>
          <ProjectHeader project={project} status={projectStatus(project, allItems)} />
          <p className="breadcrumb">
            {baugruppe}
            {groupHint ? <><span className="sep">›</span>{groupHint}</> : null}
            <span className="sep">›</span>{bauteil}
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
      />
    </>
  );
}
