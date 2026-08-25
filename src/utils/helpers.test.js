/**
 * Tests: Status-/Ampel-Berechnung ignoriert ersetzte Altpositionen (Sprint 2B).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  baugruppeStatus,
  projectStatus,
  remainingQty,
  projectShortLabel,
  allUpdatesSucceeded,
} from "./helpers.js";

describe("baugruppeStatus ignoriert ersetzte Altpositionen", () => {
  it("offene Restmenge einer ersetzten Altposition erzeugt keinen offenen Bedarf mehr", () => {
    const items = [
      // Altposition: 20 benötigt, 12 vorbereitet, ersetzt -> darf Ampel nicht mehr auf Rot ziehen
      { id: "old", menge: 20, bereit: 12, bestellt: false, ersetzt_durch: "new" },
      // Neue Ersatzposition: vollständig bereit -> Baugruppe insgesamt "Bereit"
      { id: "new", menge: 20, bereit: 20, bestellt: false, ersetzt_durch: null },
    ];
    assert.equal(baugruppeStatus(items).key, "bereit");
  });

  it("eine ersetzte Position allein ergibt 'leer' statt 'offen'", () => {
    const items = [{ id: "old", menge: 20, bereit: 12, bestellt: false, ersetzt_durch: "new" }];
    assert.equal(baugruppeStatus(items).key, "leer");
  });

  it("ohne Ersetzung verhält sich die Berechnung wie bisher", () => {
    const items = [{ id: "a", menge: 20, bereit: 12, bestellt: false }];
    assert.equal(baugruppeStatus(items).key, "offen");
  });
});

describe("projectStatus ignoriert ersetzte Altpositionen", () => {
  it("nur aktive Positionen fließen in den Prozentsatz ein", () => {
    const project = { id: "p1" };
    const items = [
      { id: "old", project_id: "p1", menge: 20, bereit: 0, ersetzt_durch: "new" },
      { id: "new", project_id: "p1", menge: 20, bereit: 20, ersetzt_durch: null },
    ];
    const status = projectStatus(project, items);
    assert.equal(status.pct, 100);
    assert.equal(status.label, "Montagebereit");
  });
});

describe("Sprint 2C – Test F: Mengenreduzierung bei bereit > neue Menge", () => {
  it("Restmenge wird nie negativ (bestehendes Math.max(0, ...))", () => {
    // 20 x M16x60 benötigt, 12 vorbereitet, Bedarf auf 8 reduziert -> bereit bleibt 12 (überzählig übrig).
    const item = { menge: 8, bereit: 12 };
    assert.equal(remainingQty(item), 0);
    assert.equal(item.bereit, 12); // remainingQty verändert bereit nicht
  });

  it("normale Restmenge bleibt korrekt (keine Regression)", () => {
    assert.equal(remainingQty({ menge: 20, bereit: 12 }), 8);
  });
});

describe("projectShortLabel: Rücknavigation verwendet vorhandene Kurzbezeichnung", () => {
  it("verwendet project.name (dasselbe Feld, das das Anlage-Formular 'Kurzbezeichnung' nennt)", () => {
    assert.equal(projectShortLabel({ nr: "2024-015", name: "Pergola" }), "Pergola");
  });

  it("ist NICHT aus project.nr abgeleitet oder zusammengesetzt (kein Erraten)", () => {
    const label = projectShortLabel({ nr: "Pergola-2024", name: "Andere Bezeichnung" });
    assert.equal(label, "Andere Bezeichnung");
    assert.notEqual(label, "Pergola-2024");
  });

  it("liefert bei fehlendem Projekt/Namen einen leeren String statt eines Fehlers", () => {
    assert.equal(projectShortLabel(null), "");
    assert.equal(projectShortLabel({}), "");
  });
});

describe("allUpdatesSucceeded: Lager-'zuletzt geändert' nur nach vollständigem Erfolg", () => {
  it("true nur wenn ALLE Teil-Updates einer Zeile erfolgreich waren", () => {
    assert.equal(allUpdatesSucceeded([true, true, true]), true);
  });

  it("false sobald ein einzelnes Teil-Update fehlschlägt", () => {
    assert.equal(allUpdatesSucceeded([true, false, true]), false);
  });

  it("leere Ergebnisliste gilt als erfolgreich (nichts zu speichern)", () => {
    assert.equal(allUpdatesSucceeded([]), true);
  });
});
