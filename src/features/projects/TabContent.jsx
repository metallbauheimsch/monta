import TechnikerEditor from "../fastening/TechnikerEditor";
import EinkaufView from "../fastening/EinkaufView";
import LagerView from "../fastening/LagerView";
import Checks from "../fastening/Checks";
import PrintView from "../fastening/PrintView";

export default function TabContent({
  tab,
  project,
  baugruppe,
  bauteil,
  bauteilItems,
  baugruppeItems,
  projectItems,
  allItems,
  allProjects,
  structureRows,
  fullModuleAccess,
  addItem,
  updateItem,
  deleteItem,
  replaceItem,
  replaceItemsBulk,
  setProjectCompletion,
}) {
  if (tab === "tb") {
    return (
      <TechnikerEditor
        items={bauteilItems}
        allProjectItems={projectItems}
        addItem={addItem}
        updateItem={updateItem}
        deleteItem={deleteItem}
        replaceItem={replaceItem}
        baugruppe={baugruppe}
        bauteil={bauteil}
        project={project}
      />
    );
  }
  if (tab === "pruefung")
    return (
      <Checks
        items={projectItems}
        project={project}
        setProjectCompletion={setProjectCompletion}
      />
    );
  if (tab === "material")
    return (
      <LagerView
        items={projectItems}
        updateItem={updateItem}
        replaceItemsBulk={replaceItemsBulk}
        hasFullModuleAccess={fullModuleAccess}
        project={project}
        setProjectCompletion={setProjectCompletion}
      />
    );
  if (tab === "bestellliste")
    return (
      <EinkaufView
        items={projectItems}
        project={project}
        updateItem={updateItem}
        allItems={allItems}
        allProjects={allProjects}
      />
    );
  if (tab === "druck")
    return (
      <PrintView
        project={project}
        baugruppe={baugruppe}
        items={baugruppeItems}
        projectItems={projectItems}
        structureRows={structureRows}
      />
    );
  return null;
}
