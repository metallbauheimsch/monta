import { useEffect } from "react";
import { projectShortLabel } from "../../utils/helpers";
import { TAB_LABELS, projectNavTabsFor, projectWideTabsFor } from "../../utils/tabs";
import TabContent from "./TabContent";

/**
 * Prüfung, Lager, Warenkorb und Druck sind projektbezogen, nicht
 * bauteilbezogen (Sprint: Projektnavigation) - deshalb keine künstliche
 * Bauteilauswahl. Ruft dieselbe TabContent-Komponente wie die
 * bauteilbezogene Ansicht (ProjectView) auf, keine parallele Fachlogik.
 */
export default function ProjectWideView({
  project,
  projectItems,
  allItems,
  allProjects,
  structureRows,
  backToDetail,
  fullModuleAccess,
  tab,
  setTab,
  updateItem,
  replaceItem,
  replaceItemsBulk,
  setProjectCompletion,
  openProjectTab,
  openBauteil,
}) {
  // Sprint 2A: zusätzlich die projektweite, rein lesende TB-Übersicht vorne.
  const visibleTabs = projectNavTabsFor();

  useEffect(() => {
    // Rückfall bei unbekanntem Reiter unverändert auf den ersten bisherigen
    // projektweiten Reiter (Prüfung), nicht auf die TB-Übersicht.
    if (!visibleTabs.includes(tab)) setTab(projectWideTabsFor()[0]);
  }, [visibleTabs, tab, setTab]);

  return (
    <>
      <button className="ghost" onClick={backToDetail}>
        ← {projectShortLabel(project)}
      </button>
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
        baugruppe={null}
        bauteil={null}
        bauteilItems={[]}
        baugruppeItems={projectItems}
        projectItems={projectItems}
        allItems={allItems}
        allProjects={allProjects}
        structureRows={structureRows}
        fullModuleAccess={fullModuleAccess}
        updateItem={updateItem}
        replaceItem={replaceItem}
        replaceItemsBulk={replaceItemsBulk}
        setProjectCompletion={setProjectCompletion}
        openProjectTab={openProjectTab}
        openBauteil={openBauteil}
      />
    </>
  );
}
