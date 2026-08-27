/**
 * Tests: Druckansicht blendet den reinen Systemhinweis "Automatisch
 * ergänzt" aus, ohne echte fachliche Hinweise zu verschlucken und ohne
 * die gespeicherten Daten zu verändern (Praxiskorrektur-Sprint, Abschnitt
 * 8/8.1). Verwendet die bestehende zentrale Bereinigung
 * (displayHinweisWithoutAutoMark aus fasteningRules.js) - keine zweite
 * Parsing-Logik.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aggregateForPrint } from "./printAggregation.js";

function item(overrides = {}) {
  return {
    id: overrides.id || "id-1",
    einbauort: "Pergola / Stütze S1",
    bezeichnung: "Sechskantschraube",
    groesse: "M10",
    laenge: "30",
    oberflaeche: "feuerverzinkt",
    menge: 1,
    hinweis: "",
    important_note: false,
    ...overrides,
  };
}

describe("H) reiner Systemhinweis 'Automatisch ergänzt' wird in der Druckansicht nicht angezeigt", () => {
  it("Position mit ausschließlich 'Automatisch ergänzt' hat leeren Druck-Hinweis", () => {
    const rows = aggregateForPrint([item({ hinweis: "Automatisch ergänzt" })], {});
    assert.equal(rows.length, 1);
    assert.equal(rows[0].hinweis, "");
  });

  it("Original-Item bleibt unverändert (nur Anzeige betroffen, keine Datenänderung)", () => {
    const source = item({ hinweis: "Automatisch ergänzt" });
    aggregateForPrint([source], {});
    assert.equal(source.hinweis, "Automatisch ergänzt");
  });
});

describe("I) normale fachliche Hinweise bleiben in der Druckansicht sichtbar", () => {
  it("ein echter Hinweis ohne Systemmarker erscheint unverändert", () => {
    const rows = aggregateForPrint([item({ hinweis: "Lochspalt verfüllen" })], {});
    assert.equal(rows[0].hinweis, "Lochspalt verfüllen");
  });
});

describe("J) zusammengesetzte Hinweise: Systemanteil entfernen, fachlichen Anteil erhalten", () => {
  it("'Automatisch ergänzt | Sondermontage' zeigt nur 'Sondermontage'", () => {
    const rows = aggregateForPrint(
      [item({ hinweis: "Automatisch ergänzt | Sondermontage" })],
      {}
    );
    assert.equal(rows[0].hinweis, "Sondermontage");
  });

  it("Wichtig-Kennzeichnung bleibt trotz Systemanteil erhalten", () => {
    const rows = aggregateForPrint(
      [item({ hinweis: "Automatisch ergänzt | Sondermontage", important_note: true })],
      {}
    );
    assert.equal(rows[0].important_note, true);
  });
});

describe("Zusammenfassung mehrerer Positionen im selben Bauteil", () => {
  it("automatisch ergänzte und normale Position mit gleichem Hinweis: nur der fachliche Hinweis erscheint einmal", () => {
    const rows = aggregateForPrint(
      [
        item({ id: "a", hinweis: "Automatisch ergänzt" }),
        item({ id: "b", hinweis: "Lochspalt verfüllen" }),
      ],
      {}
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].hinweis, "Lochspalt verfüllen");
    assert.equal(rows[0].menge, 2);
  });

  it("gleiche Position in unterschiedlichen Bauteilen bleibt getrennt (Bauteilstruktur unverändert)", () => {
    const rows = aggregateForPrint(
      [
        item({ id: "a", einbauort: "Pergola / Stütze S1" }),
        item({ id: "b", einbauort: "Pergola / Stütze S2" }),
      ],
      {}
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].bauteil, "Stütze S1");
    assert.equal(rows[1].bauteil, "Stütze S2");
  });
});
