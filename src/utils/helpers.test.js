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
    assert.equal(status.label, "bereit");
  });
});

describe("Sprint 1: einheitliche Projektampel (Rot offen / Gelb bestellt / Grün bereit / Grau keine Positionen)", () => {
  const project = { id: "p1" };
  const item = (o) => ({ project_id: "p1", menge: 10, bereit: 0, bestellt: false, ersetzt_durch: null, ...o });

  it("alle Mengen vollständig bereit -> Grün 'bereit', 100 %", () => {
    const s = projectStatus(project, [item({ id: "a", bereit: 10 }), item({ id: "b", menge: 4, bereit: 6 })]);
    assert.deepEqual([s.key, s.cls, s.label, s.emoji, s.pct], ["bereit", "green", "bereit", "🟢", 100]);
  });

  it("Fehlmengen vollständig bestellt, aber nicht geliefert -> Gelb 'bestellt'", () => {
    const s = projectStatus(project, [
      item({ id: "a", bereit: 10 }),
      item({ id: "b", bereit: 3, bestellt: true }),
    ]);
    assert.deepEqual([s.key, s.cls, s.label, s.emoji, s.pct], ["bestellt", "yellow", "bestellt", "🟡", 50]);
  });

  it("mindestens eine Fehlmenge nicht bestellt -> Rot 'offen'", () => {
    const s = projectStatus(project, [
      item({ id: "a", bereit: 2, bestellt: true }),
      item({ id: "b", bereit: 3, bestellt: false }),
    ]);
    assert.deepEqual([s.key, s.cls, s.label, s.emoji], ["offen", "red", "offen", "🔴"]);
  });

  it("teilweise bereit, aber nichts bestellt -> Rot 'offen' (früher Gelb 'Teilweise bereit')", () => {
    const s = projectStatus(project, [item({ id: "a", bereit: 10 }), item({ id: "b", bereit: 0 })]);
    assert.equal(s.cls, "red");
    assert.equal(s.label, "offen");
    assert.equal(s.pct, 50, "Materialfortschritt bleibt unverändert berechnet");
  });

  it("keine Positionen -> Grau 'keine Positionen', 0 %", () => {
    const s = projectStatus(project, [item({ id: "x", project_id: "anderes" })]);
    assert.deepEqual([s.key, s.cls, s.label, s.emoji, s.pct], ["leer", "grey", "keine Positionen", "⚪", 0]);
  });

  it("nur ersetzte Altpositionen -> Grau 'keine Positionen'", () => {
    const s = projectStatus(project, [item({ id: "old", bereit: 0, ersetzt_durch: "neu" })]);
    assert.equal(s.key, "leer");
    assert.equal(s.cls, "grey");
  });

  it("ersetzte offene Altposition macht ein sonst bereites Projekt nicht rot", () => {
    const s = projectStatus(project, [
      item({ id: "old", bereit: 0, ersetzt_durch: "new" }),
      item({ id: "new", bereit: 10 }),
    ]);
    assert.equal(s.key, "bereit");
  });

  it("gemischte Baugruppen: eine offene Baugruppe macht das Projekt rot, sonst gilt der schlechteste Stand", () => {
    const bgBereit = item({ id: "a", einbauort: "BG1 / T1", bereit: 10 });
    const bgBestellt = item({ id: "b", einbauort: "BG2 / T1", bereit: 0, bestellt: true });
    const bgOffen = item({ id: "c", einbauort: "BG3 / T1", bereit: 0, bestellt: false });
    assert.equal(projectStatus(project, [bgBereit, bgBestellt, bgOffen]).key, "offen");
    assert.equal(projectStatus(project, [bgBereit, bgBestellt]).key, "bestellt");
    assert.equal(projectStatus(project, [bgBereit]).key, "bereit");
  });

  it("Projektampel entspricht baugruppeStatus über alle Projektpositionen (eine gemeinsame Regel)", () => {
    const items = [item({ id: "a", bereit: 10 }), item({ id: "b", bereit: 1, bestellt: true })];
    assert.equal(projectStatus(project, items).key, baugruppeStatus(items).key);
  });

  it("Positionen anderer Projekte fließen nicht ein", () => {
    const s = projectStatus(project, [item({ id: "a", bereit: 10 }), item({ id: "z", project_id: "p2", bereit: 0 })]);
    assert.equal(s.key, "bereit");
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
