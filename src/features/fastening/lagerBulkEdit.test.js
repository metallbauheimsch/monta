/**
 * Tests: Lager-Gesamtänderung (Praxis-Sprint) - eine Änderung an einer
 * aggregierten Lagerzeile gilt für ALLE zusammengefassten
 * Ursprungspositionen. Reine Logik, keine Component-Render-Tests.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveBulkPatch,
  hasMixedHinweis,
  affectedBauteilCount,
  operationallyTouchedItems,
} from "./lagerBulkEdit.js";

function item(overrides = {}) {
  return {
    id: overrides.id || "id-1",
    baugruppe: "Pergola",
    bauteil: "Stütze S1",
    bezeichnung: "Sechskantschraube",
    groesse: "M10",
    laenge: "30",
    oberflaeche: "feuerverzinkt",
    menge: 4,
    bereit: 0,
    bestellt: false,
    hinweis: "",
    important_note: false,
    ...overrides,
  };
}

describe("A) unberührte Positionen: reine Direktänderung für alle", () => {
  it("zwei unberührte Positionen, Ausführung geändert -> beide direkt aktualisiert", () => {
    const rows = [item({ id: "a" }), item({ id: "b", bauteil: "Stütze S2" })];
    const { directUpdates, replacements } = resolveBulkPatch(rows, { oberflaeche: "Edelstahl" });
    assert.equal(directUpdates.length, 2);
    assert.equal(replacements.length, 0);
    assert.equal(directUpdates.find((u) => u.id === "a").fields.oberflaeche, "Edelstahl");
  });
});

describe("B) gemischte Positionen: nur operativ bearbeitete werden ersetzt", () => {
  it("eine bereits vorbereitete (bereit>0) + eine unberührte -> gemischtes Ergebnis", () => {
    const rows = [item({ id: "touched", bereit: 2 }), item({ id: "fresh" })];
    const { directUpdates, replacements } = resolveBulkPatch(rows, { groesse: "M12" });
    assert.equal(replacements.length, 1);
    assert.equal(replacements[0].source.id, "touched");
    assert.equal(directUpdates.length, 1);
    assert.equal(directUpdates[0].id, "fresh");
  });

  it("Ersatzfelder der operativ bearbeiteten Position starten bei 0/false (bestehende Regel)", () => {
    const rows = [item({ id: "touched", bereit: 2, bestellt: true, menge: 6 })];
    const { replacements } = resolveBulkPatch(rows, { groesse: "M12" });
    assert.equal(replacements[0].fields.bereit, 0);
    assert.equal(replacements[0].fields.bestellt, false);
    assert.equal(replacements[0].fields.menge, 6);
  });

  it("bereits bestellte (bestellt=true, bereit=0) Position wird ebenfalls ersetzt", () => {
    const rows = [item({ id: "ordered", bestellt: true })];
    const { replacements } = resolveBulkPatch(rows, { bezeichnung: "Zylinderschraube" });
    assert.equal(replacements.length, 1);
  });
});

describe("F) Größe wird bei Übernahme normalisiert (wie bisherige commitFieldDraft-Regel)", () => {
  it("'8' wird bei einem metrischen Artikel zu 'M8'", () => {
    const rows = [item({ id: "a", bezeichnung: "Sechskantschraube" })];
    const { directUpdates } = resolveBulkPatch(rows, { groesse: "8" });
    assert.equal(directUpdates[0].fields.groesse, "M8");
  });

  it("gleichzeitige Bezeichnungsänderung wird als Normalisierungsbasis verwendet", () => {
    const rows = [item({ id: "a", bezeichnung: "Holzschraube" })];
    const { directUpdates } = resolveBulkPatch(rows, {
      bezeichnung: "Sechskantschraube",
      groesse: "10",
    });
    assert.equal(directUpdates[0].fields.groesse, "M10");
  });
});

describe("C) reine Hinweis-/Wichtig-Änderung löst NIE eine Ersetzung aus", () => {
  it("bereits vorbereitete Position: nur Hinweis geändert -> Direktänderung", () => {
    const rows = [item({ id: "touched", bereit: 3, bestellt: true })];
    const { directUpdates, replacements } = resolveBulkPatch(rows, { hinweis: "Neuer Hinweis" });
    assert.equal(replacements.length, 0);
    assert.equal(directUpdates.length, 1);
    assert.equal(directUpdates[0].fields.hinweis, "Neuer Hinweis");
  });

  it("nur 'Wichtig' geändert -> Direktänderung", () => {
    const rows = [item({ id: "touched", bereit: 3 })];
    const { directUpdates, replacements } = resolveBulkPatch(rows, { important_note: true });
    assert.equal(replacements.length, 0);
    assert.equal(directUpdates[0].fields.important_note, true);
  });
});

describe("D) Menge ist niemals Teil der Gesamtänderung (keine erfundene Verteilung)", () => {
  it("ein versehentlich übergebenes 'menge' im Patch wird ignoriert", () => {
    const rows = [item({ id: "a", menge: 4 })];
    const { directUpdates } = resolveBulkPatch(rows, { menge: 999, oberflaeche: "Edelstahl" });
    assert.equal(directUpdates[0].fields.menge, undefined);
  });
});

describe("E) Drehmoment-/HV-Normalisierung wirkt je Position einzeln", () => {
  it("jede Position behält ihren eigenen bisherigen Hinweis als Basis für Auto-Drehmoment", () => {
    const rows = [
      item({ id: "a", bezeichnung: "HV-Garnitur", groesse: "M16", hinweis: "Lochspalt verfüllen" }),
      item({ id: "b", bezeichnung: "HV-Garnitur", groesse: "M16", hinweis: "Sondermontage" }),
    ];
    const { directUpdates } = resolveBulkPatch(rows, { groesse: "M20" });
    const a = directUpdates.find((u) => u.id === "a");
    const b = directUpdates.find((u) => u.id === "b");
    assert.match(a.fields.hinweis, /Lochspalt verfüllen/);
    assert.match(a.fields.hinweis, /450 Nm/);
    assert.match(b.fields.hinweis, /Sondermontage/);
    assert.match(b.fields.hinweis, /450 Nm/);
  });

  it("HV-Garnitur erzwingt feuerverzinkt je Position, wenn die Bezeichnung bewusst geändert wird", () => {
    const rows = [item({ id: "a", oberflaeche: "Edelstahl" })];
    const { directUpdates } = resolveBulkPatch(rows, { bezeichnung: "HV-Garnitur" });
    assert.equal(directUpdates[0].fields.oberflaeche, "feuerverzinkt");
  });
});

describe("hasMixedHinweis: erkennt unterschiedliche Hinweistexte in einer Zeile", () => {
  it("identische Hinweise -> false", () => {
    assert.equal(hasMixedHinweis([item({ hinweis: "X" }), item({ hinweis: "X" })]), false);
  });
  it("unterschiedliche Hinweise -> true", () => {
    assert.equal(hasMixedHinweis([item({ hinweis: "X" }), item({ hinweis: "Y" })]), true);
  });
  it("leere Zeile -> false", () => {
    assert.equal(hasMixedHinweis([]), false);
  });
});

describe("affectedBauteilCount / operationallyTouchedItems", () => {
  it("zählt eindeutige Baugruppe+Bauteil-Kombinationen", () => {
    const rows = [
      item({ id: "a", bauteil: "Stütze S1" }),
      item({ id: "b", bauteil: "Stütze S1" }),
      item({ id: "c", bauteil: "Stütze S2" }),
    ];
    assert.equal(affectedBauteilCount(rows), 2);
  });

  it("liefert nur bereits vorbereitete/bestellte Positionen", () => {
    const rows = [item({ id: "a", bereit: 1 }), item({ id: "b" }), item({ id: "c", bestellt: true })];
    const touched = operationallyTouchedItems(rows);
    assert.deepEqual(touched.map((i) => i.id).sort(), ["a", "c"]);
  });
});
