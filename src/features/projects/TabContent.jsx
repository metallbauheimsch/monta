import TechnikerEditor from "../fastening/TechnikerEditor";
import EinkaufView from "../fastening/EinkaufView";
import LagerView from "../fastening/LagerView";
import Checks from "../fastening/Checks";
import PrintView from "../fastening/PrintView";

// Reihenfolge/Bezeichnung der Reiter: siehe utils/tabs.js
// - tb: aktuelles Bauteil (schnelle PC-Erfassung)
// - pruefung: aktuelle Baugruppe
// - material (Anzeige "Lager") / bestellliste / druck: gesamtes Projekt
//
// Sprint 3: Reiter "Montage" entfernt (siehe utils/tabs.js). Die Druckansicht
// ist bereits unabhängig von der Montageansicht (eigene Props, kein Import).
//
// Sprint 5: Lager zeigt jetzt projektweit alle Positionen (inkl. Baugruppe
// je Zeile) statt nur die aktuelle Baugruppe - entspricht dem tatsächlichen
// Arbeitsablauf im Lager.
export default function TabContent({
  tab,
  deviceMode,
  project,
  baugruppe,
  bauteil,
  bauteilItems,
  baugruppeItems,
  projectItems,
  addItem,
  updateItem,
  deleteItem,
  isBaugruppeBestellt,
  setBaugruppeBestellt,
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
      />
    );
  }
  if (tab === "pruefung") return <Checks items={baugruppeItems} baugruppe={baugruppe} project={project} />;
  if (tab === "material") return <LagerView items={projectItems} updateItem={updateItem} project={project} />;
  if (tab === "bestellliste")
    return (
      <EinkaufView
        items={projectItems}
        project={project}
        isBaugruppeBestellt={isBaugruppeBestellt}
        setBaugruppeBestellt={setBaugruppeBestellt}
      />
    );
  if (tab === "druck")
    return <PrintView project={project} items={projectItems} isBaugruppeBestellt={isBaugruppeBestellt} />;
  return null;
}
