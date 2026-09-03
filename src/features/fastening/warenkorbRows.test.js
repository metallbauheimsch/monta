/**
 * Tests: Warenkorb-Zeilenberechnung + projektübergreifende Aggregation für
 * die Mehrprojekt-Lieferantenanfrage (Praxis-Sprint). Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWarenkorbRows,
  buildMailRowsForProject,
  aggregateMailRowsAcrossProjects,
} from "./warenkorbRows.js";

function item(overrides = {}) {
  return {
    id: overrides.id || "id-1",
    project_id: "p1",
    einbauort: "Pergola / Stütze S1",
    bezeichnung: "Sechskantschraube",
    groesse: "M12",
    laenge: "50",
    oberflaeche: "feuerverzinkt",
    menge: 10,
    bereit: 0,
    bestellt: false,
    important_note: false,
    ...overrides,
  };
}

function project(overrides = {}) {
  return { id: "p1", nr: "32089", name: "Pergola", baugruppe: null, ...overrides };
}

describe("V) Einzelprojekt: gleiche Artikel wie bisher", () => {
  it("eine Zeile mit Fehlmenge = Gesamtmenge, wenn nichts geliefert ist", () => {
    const rows = buildWarenkorbRows([item()], project());
    assert.equal(rows.length, 1);
    assert.equal(rows[0].fehlmenge, 10);
  });

  it("vollständig gelieferte Zeile bleibt sichtbar (Fehlmenge 0)", () => {
    const rows = buildWarenkorbRows([item({ bereit: 10 })], project());
    assert.equal(rows.length, 1);
    assert.equal(rows[0].vollstaendig, true);
  });
});

describe("Z) ersetzte/inaktive Positionen zählen nicht als Bedarf", () => {
  it("eine ersetzte Position wird ausgeschlossen", () => {
    const rows = buildWarenkorbRows([item({ ersetzt_durch: "new-id" })], project());
    assert.equal(rows.length, 0);
  });
});

describe("AA) bereits bestellte/vollständige Mengen nicht in der Mailanfrage", () => {
  it("bereits bestellte Position wird nicht in die Mailanfrage aufgenommen", () => {
    const rows = buildMailRowsForProject([item({ bestellt: true })], project());
    assert.equal(rows.length, 0);
  });

  it("vollständig gelieferte Position wird nicht in die Mailanfrage aufgenommen", () => {
    const rows = buildMailRowsForProject([item({ bereit: 10 })], project());
    assert.equal(rows.length, 0);
  });

  it("offene, unbestellte Position erscheint in der Mailanfrage", () => {
    const rows = buildMailRowsForProject([item()], project());
    assert.equal(rows.length, 1);
    assert.equal(rows[0].menge, 10);
  });
});

describe("GPT-Code-Review-Korrektur: Lieferantenanfrage verwendet die offene Fehlmenge, nicht die Gesamtmenge", () => {
  it("Test A: Einzelprojekt, teilweise vorhanden (Gesamt 10, bereit 4) -> Anfrage 6", () => {
    const rows = buildMailRowsForProject([item({ menge: 10, bereit: 4 })], project());
    assert.equal(rows.length, 1);
    assert.equal(rows[0].menge, 6);
  });

  it("Test B: mehrere Projekte, teilweise vorhanden -> Anfrage-Mengen summiert (6 + 10 = 16, NICHT 25)", () => {
    const rowsA = buildMailRowsForProject(
      [item({ id: "a", project_id: "pA", menge: 10, bereit: 4 })],
      project({ id: "pA" })
    );
    const rowsB = buildMailRowsForProject(
      [item({ id: "b", project_id: "pB", menge: 15, bereit: 5 })],
      project({ id: "pB" })
    );
    const combined = aggregateMailRowsAcrossProjects([rowsA, rowsB]);
    assert.equal(combined.length, 1);
    assert.equal(combined[0].menge, 16);
  });

  it("Test C: vollständig vorhanden (Gesamt 10, bereit 10) -> keine Mailzeile", () => {
    const rows = buildMailRowsForProject([item({ menge: 10, bereit: 10 })], project());
    assert.equal(rows.length, 0);
  });

  it("Test D: bereits bestellt -> keine Mailzeile, auch bei offener Fehlmenge", () => {
    const rows = buildMailRowsForProject([item({ menge: 10, bereit: 4, bestellt: true })], project());
    assert.equal(rows.length, 0);
  });

  it("Test E: ersetzte Altposition -> keine Mailzeile", () => {
    const rows = buildMailRowsForProject(
      [item({ menge: 10, bereit: 4, ersetzt_durch: "new-id" })],
      project()
    );
    assert.equal(rows.length, 0);
  });
});

describe("W/X) Mehrprojekt-Aggregation: identische Artikel werden summiert, Größennormalisierung greift", () => {
  it("gleicher Artikel in zwei Projekten -> eine summierte Zeile", () => {
    const rowsA = buildMailRowsForProject([item({ id: "a", project_id: "pA", menge: 10 })], project({ id: "pA" }));
    const rowsB = buildMailRowsForProject(
      [item({ id: "b", project_id: "pB", menge: 15, groesse: "12" })],
      project({ id: "pB" })
    );
    const combined = aggregateMailRowsAcrossProjects([rowsA, rowsB]);
    assert.equal(combined.length, 1);
    assert.equal(combined[0].menge, 25);
    assert.equal(combined[0].groesse, "M12");
  });
});

describe("Y) unterschiedliche Länge/Ausführung bleiben getrennt", () => {
  it("gleiche Bezeichnung/Größe, unterschiedliche Länge -> zwei Zeilen", () => {
    const rowsA = buildMailRowsForProject([item({ id: "a", laenge: "50" })], project());
    const rowsB = buildMailRowsForProject([item({ id: "b", laenge: "60" })], project());
    const combined = aggregateMailRowsAcrossProjects([rowsA, rowsB]);
    assert.equal(combined.length, 2);
  });

  it("gleiche Größe/Länge, unterschiedliche Ausführung -> zwei Zeilen", () => {
    const rowsA = buildMailRowsForProject([item({ id: "a", oberflaeche: "feuerverzinkt" })], project());
    const rowsB = buildMailRowsForProject([item({ id: "b", oberflaeche: "Edelstahl" })], project());
    const combined = aggregateMailRowsAcrossProjects([rowsA, rowsB]);
    assert.equal(combined.length, 2);
  });
});
