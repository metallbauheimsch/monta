import { useEffect } from "react";
import { projectShortLabel } from "../../utils/helpers";
import { TAB_LABELS, projectWideTabsFor } from "../../utils/tabs";
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
  structureRows,
  backToDetail,
  fullModuleAccess,
  tab,
  setTab,
  updateItem,
  replaceItem,
  setProjectCompletion,
}) {
  const visibleTabs = projectWideTabsFor();

  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab(visibleTabs[0]);
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
        structureRows={structureRows}
        fullModuleAccess={fullModuleAccess}
        updateItem={updateItem}
        replaceItem={replaceItem}
        setProjectCompletion={setProjectCompletion}
      />
    </>
  );
}
