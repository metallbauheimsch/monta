/**
 * Tests: projektweite TB-Übersicht (Sprint 2A) - Gruppierung, Ausschluss
 * ersetzter Positionen, Bauteilnavigation und Abgrenzung zum Bauteil-TB.
 * Quelltext-Prüfung für die React-Komponenten, da kein React-Test-Renderer
 * im Projekt vorhanden ist (wie bei den übrigen Tests dieses Projekts).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildProjectTbBlocks } from "./projectTbBlocks.js";
import { formatEinbauort } from "../../utils/structure.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (...parts) => readFileSync(path.join(...parts), "utf8").replace(/\r\n/g, "\n");

const project = { id: "p1", nr: "24-001", name: "Pergola", baugruppe: null };

function item(id, bg, bt, extra = {}) {
  return {
    id,
    project_id: "p1",
    einbauort: formatEinbauort(bg, bt),
    pos: extra.pos ?? id,
    menge: 4,
    bezeichnung: "Sechskantschraube",
    groesse: "M12",
    laenge: "40",
    oberflaeche: "feuerverzinkt",
    hinweis: "",
    bereit: 0,
    bestellt: false,
    ...extra,
  };
}

const structureRows = [
  { project_id: "p1", baugruppe: "Stützen", bauteil: null },
  { project_id: "p1", baugruppe: "Stützen", bauteil: "S2" },
  { project_id: "p1", baugruppe: "Stützen", bauteil: "S1" },
  { project_id: "p1", baugruppe: "Träger", bauteil: null },
  { project_id: "p1", baugruppe: "Träger", bauteil: "T1" },
];

describe("buildProjectTbBlocks: Gliederung Baugruppe → Bauteil", () => {
  it("Reihenfolge wie Projektübersicht (structureRows), nicht alphabetisch", () => {
    const blocks = buildProjectTbBlocks(project, [item("1", "Stützen", "S1")], structureRows);
    assert.deepEqual(blocks.map((b) => b.baugruppe), ["Stützen", "Träger"]);
    assert.deepEqual(blocks[0].bauteile.map((b) => b.bauteil), ["S2", "S1"]);
  });

  it("jede Position landet eindeutig bei ihrer Baugruppe und ihrem Bauteil", () => {
    const items = [
      item("a", "Stützen", "S1", { pos: "1" }),
      item("b", "Stützen", "S2", { pos: "2" }),
      item("c", "Träger", "T1", { pos: "3" }),
    ];
    const blocks = buildProjectTbBlocks(project, items, structureRows);
    const find = (bg, bt) =>
      blocks.find((b) => b.baugruppe === bg).bauteile.find((x) => x.bauteil === bt).items.map((i) => i.id);
    assert.deepEqual(find("Stützen", "S1"), ["a"]);
    assert.deepEqual(find("Stützen", "S2"), ["b"]);
    assert.deepEqual(find("Träger", "T1"), ["c"]);
  });

  it("keine Zusammenfassung: gleiche Artikel im selben Bauteil bleiben einzelne Zeilen", () => {
    const items = [item("a", "Stützen", "S1", { pos: "1" }), item("b", "Stützen", "S1", { pos: "2" })];
    const s1 = buildProjectTbBlocks(project, items, structureRows)[0].bauteile.find((b) => b.bauteil === "S1");
    assert.equal(s1.items.length, 2);
    assert.deepEqual(s1.items.map((i) => i.pos), ["1", "2"]);
    assert.deepEqual(s1.items.map((i) => i.menge), [4, 4]);
  });

  it("Positionen je Bauteil nach Pos.-Nr. numerisch sortiert", () => {
    const items = [
      item("a", "Stützen", "S1", { pos: "10" }),
      item("b", "Stützen", "S1", { pos: "2" }),
      item("c", "Stützen", "S1", { pos: "1" }),
    ];
    const s1 = buildProjectTbBlocks(project, items, structureRows)[0].bauteile.find((b) => b.bauteil === "S1");
    assert.deepEqual(s1.items.map((i) => i.pos), ["1", "2", "10"]);
  });

  it("alle Anzeigefelder bleiben unverändert erhalten (Pos., Menge, Bezeichnung, Größe, Länge, Ausführung, Hinweis, Wichtig)", () => {
    const src = item("a", "Stützen", "S1", { pos: "7", menge: 9, hinweis: "Lochspalt verfüllen", important_note: true });
    const [row] = buildProjectTbBlocks(project, [src], structureRows)[0].bauteile.find((b) => b.bauteil === "S1").items;
    for (const key of ["pos", "menge", "bezeichnung", "groesse", "laenge", "oberflaeche", "hinweis", "important_note"]) {
      assert.equal(row[key], src[key], key);
    }
  });

  it("Bauteile ohne Positionen bleiben als leerer Block (zum Öffnen) erhalten", () => {
    const blocks = buildProjectTbBlocks(project, [], structureRows);
    assert.deepEqual(blocks[1].bauteile, [{ bauteil: "T1", items: [] }]);
  });

  it("Eingabe wird nicht verändert (reine Anzeige, keine neue Datenhaltung)", () => {
    const items = [item("a", "Stützen", "S1")];
    const before = JSON.stringify(items);
    buildProjectTbBlocks(project, items, structureRows);
    assert.equal(JSON.stringify(items), before);
  });
});

describe("buildProjectTbBlocks: ersetzte Positionen", () => {
  it("ersetzte Altpositionen werden ausgeblendet, die Ersatzposition bleibt sichtbar", () => {
    const items = [
      item("alt", "Stützen", "S1", { pos: "1", ersetzt_durch: "neu", bereit: 4 }),
      item("neu", "Stützen", "S1", { pos: "5" }),
    ];
    const s1 = buildProjectTbBlocks(project, items, structureRows)[0].bauteile.find((b) => b.bauteil === "S1");
    assert.deepEqual(s1.items.map((i) => i.id), ["neu"]);
  });

  it("Ampel der Baugruppe ignoriert ersetzte Positionen (wie Druck/Projektübersicht)", () => {
    const items = [
      item("alt", "Stützen", "S1", { ersetzt_durch: "neu", bereit: 0 }),
      item("neu", "Stützen", "S1", { bereit: 4 }),
    ];
    assert.equal(buildProjectTbBlocks(project, items, structureRows)[0].status.key, "bereit");
  });
});

describe("ProjectTbOverview.jsx: rein lesend, Bauteil-Überschrift öffnet den Bauteil-TB", () => {
  const source = read(dir, "ProjectTbOverview.jsx");

  it("Klick auf die Bauteil-Überschrift ruft openBauteil(baugruppe, bauteil, 'tb') auf", () => {
    assert.match(source, /openBauteil\?\.\(baugruppe, bauteil, "tb"\)/);
    assert.match(source, /onClick=\{\(\) => open\(baugruppe, bauteil\)\}/);
  });

  it("keine Bearbeitungsfunktionen und keine Eingabefelder", () => {
    assert.equal(/updateItem|addItem|deleteItem|replaceItem|supabase/.test(source), false);
    assert.equal(/<input|<select|<textarea/.test(source), false);
  });

  it("nutzt die Gruppierungslogik ohne Druck-Aggregation", () => {
    assert.match(source, /buildProjectTbBlocks/);
    assert.equal(/aggregateForPrint/.test(source), false);
  });
});

describe("Abgrenzung: Bauteil-TB, Bauteilansicht und Druck bleiben unverändert", () => {
  it("TabContent: Bauteil-TB weiterhin TechnikerEditor mit bauteilItems, TB-Übersicht separat", () => {
    const source = read(dir, "TabContent.jsx");
    assert.match(source, /if \(tab === "tb"\) \{\n    return \(\n      <TechnikerEditor\n        items=\{bauteilItems\}/);
    assert.match(source, /if \(tab === PROJECT_TB_TAB\) \{[\s\S]*?<ProjectTbOverview/);
  });

  it("ProjectView (Bauteilansicht) verwendet weiterhin visibleTabsFor, nicht die Projekt-Navigation", () => {
    const source = read(dir, "ProjectView.jsx");
    assert.match(source, /const visibleTabs = visibleTabsFor\(\);/);
    assert.equal(/projectNavTabsFor|ProjectTbOverview/.test(source), false);
  });

  it("ProjectDetail und ProjectWideView zeigen die Projekt-Navigation inkl. TB-Übersicht", () => {
    assert.match(read(dir, "ProjectDetail.jsx"), /projectNavTabsFor\(\)/);
    const wide = read(dir, "ProjectWideView.jsx");
    assert.match(wide, /const visibleTabs = projectNavTabsFor\(\);/);
    assert.match(wide, /openBauteil=\{openBauteil\}/);
  });

  it("ProjectWideView: Rückfall bei unbekanntem Reiter bleibt Prüfung (erster bisheriger projektweiter Reiter)", () => {
    assert.match(read(dir, "ProjectWideView.jsx"), /setTab\(projectWideTabsFor\(\)\[0\]\)/);
  });

  it("App.jsx: openBauteil nimmt optional einen expliziten Reiter, sonst unverändert tabForBauteilOpen", () => {
    const source = read(dir, "..", "..", "App.jsx");
    assert.match(source, /function openBauteil\(baugruppeName, bauteilName, explicitTab\)/);
    assert.match(source, /explicitTab \|\|\n\s+tabForBauteilOpen\(lastFachTabRef\.current, isNarrow, \{ fullAccess: tabFullAccess \}\)/);
  });

  it("Druckansicht wird von der TB-Übersicht nicht verwendet oder verändert", () => {
    assert.equal(/PrintView/.test(read(dir, "ProjectTbOverview.jsx")), false);
  });
});
