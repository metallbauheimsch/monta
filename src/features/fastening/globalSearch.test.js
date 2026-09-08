/**
 * Tests: projektübergreifende Lager-Suche (Praxis-Sprint) - reine
 * Berechnungsfunktion, keine Browser-/Supabase-Abhängigkeit.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildGlobalSearchResults } from "./globalSearch.js";

function project(overrides) {
  return { id: "p1", nr: "1000", name: "Pergola", archived: false, ...overrides };
}

function item(overrides) {
  return {
    id: "i1",
    project_id: "p1",
    einbauort: "Pergola S1 / Stütze 1",
    pos: "1",
    menge: 10,
    bezeichnung: "Sechskantschraube",
    groesse: "M10",
    laenge: "30",
    oberflaeche: "feuerverzinkt",
    bereit: 0,
    bestellt: false,
    ersetzt_durch: null,
    ...overrides,
  };
}

describe("X) berücksichtigt mehrere aktive Projekte", () => {
  it("findet eine offene Position in einem anderen als dem aktuell betrachteten Projekt", () => {
    const projects = [project(), project({ id: "p2", nr: "2000", name: "Carport" })];
    const items = [item(), item({ id: "i2", project_id: "p2", bezeichnung: "Sechskantmutter" })];
    const results = buildGlobalSearchResults("Sechskantmutter", { projects, items });
    assert.equal(results.length, 1);
    assert.equal(results[0].project.id, "p2");
    assert.equal(results[0].row.bezeichnung, "Sechskantmutter");
  });

  it("leere Suche liefert keine Treffer (keine ungewollte Vollanzeige aller Positionen)", () => {
    const projects = [project()];
    const items = [item()];
    assert.deepEqual(buildGlobalSearchResults("", { projects, items }), []);
    assert.deepEqual(buildGlobalSearchResults("   ", { projects, items }), []);
  });
});

describe("Y) archivierte Projekte werden ausgeschlossen", () => {
  it("eine Position aus einem archivierten Projekt erscheint nicht als Treffer", () => {
    const projects = [project({ id: "p2", archived: true })];
    const items = [item({ project_id: "p2" })];
    const results = buildGlobalSearchResults("Sechskantschraube", { projects, items });
    assert.equal(results.length, 0);
  });
});

describe("Z) ersetzte Altpositionen erscheinen nicht als offene Treffer", () => {
  it("eine ersetzte Position (ersetzt_durch gesetzt) wird ausgeschlossen", () => {
    const projects = [project()];
    const items = [item({ ersetzt_durch: "i-neu" })];
    const results = buildGlobalSearchResults("Sechskantschraube", { projects, items });
    assert.equal(results.length, 0);
  });
});

describe("AA) wiederverwendet die zentrale Fehlmengen-Logik (buildWarenkorbRows) - keine zweite Definition von 'offen'", () => {
  it("vollständig vorhandene Position (Fehlmenge 0) ist kein Treffer", () => {
    const projects = [project()];
    const items = [item({ menge: 10, bereit: 10 })];
    const results = buildGlobalSearchResults("Sechskantschraube", { projects, items });
    assert.equal(results.length, 0);
  });

  it("teilweise gelieferte Position (Fehlmenge > 0) ist ein Treffer mit der korrekten Fehlmenge", () => {
    const projects = [project()];
    const items = [item({ menge: 10, bereit: 4 })];
    const results = buildGlobalSearchResults("Sechskantschraube", { projects, items });
    assert.equal(results.length, 1);
    assert.equal(results[0].row.fehlmenge, 6);
  });
});

describe("AB) Treffer enthalten Projektzuordnung und Materialmerkmale", () => {
  it("Treffer trägt Projekt (nr/name) sowie Bezeichnung/Größe/Länge/Ausführung/Fehlmenge", () => {
    const projects = [project()];
    const items = [item({ menge: 5, bereit: 0 })];
    const results = buildGlobalSearchResults("M10", { projects, items });
    assert.equal(results.length, 1);
    const { project: p, row } = results[0];
    assert.equal(p.nr, "1000");
    assert.equal(p.name, "Pergola");
    assert.equal(row.bezeichnung, "Sechskantschraube");
    assert.equal(row.groesse, "M10");
    assert.equal(row.laenge, "30");
    assert.equal(row.oberflaeche, "feuerverzinkt");
    assert.equal(row.fehlmenge, 5);
  });

  it("kompakte Größe+Länge-Suche findet die Position (z. B. 1030 -> M10x30)", () => {
    const projects = [project()];
    const items = [item({ groesse: "M10", laenge: "30" })];
    const results = buildGlobalSearchResults("1030", { projects, items });
    assert.equal(results.length, 1);
  });
});
