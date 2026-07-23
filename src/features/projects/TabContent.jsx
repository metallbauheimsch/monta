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
  structureRows,
  addItem,
  updateItem,
  deleteItem,
  setBaugruppeCompletion,
}) {
  if (tab === "tb") {
    return (
      <TechnikerEditor
        items={bauteilItems}
        allProjectItems={projectItems}
        addItem={addItem}
        updateItem={updateItem}
        deleteItem={deleteItem}
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
        baugruppe={baugruppe}
        project={project}
        structureRows={structureRows}
        setBaugruppeCompletion={setBaugruppeCompletion}
      />
    );
  if (tab === "material")
    return (
      <LagerView
        items={projectItems}
        updateItem={updateItem}
        project={project}
        structureRows={structureRows}
        baugruppe={baugruppe}
        setBaugruppeCompletion={setBaugruppeCompletion}
      />
    );
  if (tab === "bestellliste")
    return (
      <EinkaufView
        items={projectItems}
        project={project}
        updateItem={updateItem}
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
