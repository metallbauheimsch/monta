/**
 * Automatisierte Paternoster-Tests (node:test).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getRegalPlatz,
  isBefestigungsFamilie,
  isGitterrostHalter,
  resolveFach,
} from "./regalOrder.js";

function fach(bezeichnung, groesse, oberflaeche) {
  return resolveFach(bezeichnung, oberflaeche, groesse)?.fach ?? null;
}

function label(bezeichnung, groesse, oberflaeche) {
  return getRegalPlatz({ bezeichnung, groesse, oberflaeche });
}

describe("Paternoster – Sonderregeln (Vorrang)", () => {
  it("Keilscheibe → 26", () => {
    assert.equal(fach("Keilscheibe DIN 6918", "M16", "HV"), 26);
  });
  it("Hilti HAS → 2", () => {
    assert.equal(fach("Hilti HAS-U", "M16", "galvanisch"), 2);
  });
  it("Edelstahl-Bolzenanker → 4", () => {
    assert.equal(fach("Bolzenanker", "M16", "A4"), 4);
  });
  it("HV-Garnitur → 26", () => {
    assert.equal(fach("HV-Garnitur", "M16", "HV"), 26);
  });
  it("unbekannt → Ohne Fachzuordnung", () => {
    assert.equal(label("Sonderteil XYZ", "M12", "Sonder"), "Ohne Fachzuordnung");
  });
});

describe("Paternoster – Dübelfamilie (Werkstoff)", () => {
  it("Edelstahl Bolzenanker → 4", () => {
    assert.equal(fach("Bolzenanker", "M12", "Edelstahl"), 4);
  });
  it("Edelstahl Fixanker → 4", () => {
    assert.equal(fach("Fixanker", "M10", "VA"), 4);
  });
  it("Edelstahl Rahmendübel → 4", () => {
    assert.equal(fach("Rahmendübel", "M8", "A2"), 4);
  });
  it("Edelstahl Betonschraube → 4", () => {
    assert.equal(fach("Betonschraube", "M12", "A4-70"), 4);
  });
  it("Edelstahl Spreizanker → 4", () => {
    assert.equal(fach("Spreizanker", "M16", "rostfrei"), 4);
  });
  it("galvanischer Bolzenanker → 25", () => {
    assert.equal(fach("Bolzenanker", "M12", "galvanisch"), 25);
  });
  it("verzinkter Fixanker → 25", () => {
    assert.equal(fach("Fixanker", "M10", "verzinkt"), 25);
  });
  it("galvanische Betonschraube → 25", () => {
    assert.equal(fach("Betonschraube", "M12", "galvanisch"), 25);
  });
  it("verzinkter Rahmendübel → 25", () => {
    assert.equal(fach("Rahmendübel", "M8", "verzinkt"), 25);
  });
  it("galvanischer Schwerlastanker → 25", () => {
    assert.equal(fach("Schwerlastanker", "M16", "galvanisch"), 25);
  });
  it("feuerverzinkter Bolzenanker → 25", () => {
    assert.equal(fach("Bolzenanker", "M12", "feuerverzinkt"), 25);
  });
  it("Betonschraube galvanisch nicht Schraubenfach 26/27", () => {
    assert.equal(fach("Betonschraube", "M12", "galvanisch"), 25);
    assert.notEqual(fach("Betonschraube", "M12", "galvanisch"), 26);
  });
});

describe("Paternoster – GiRo / Gitterrost → Fach 10", () => {
  it("GiRo-Halteklammer MW30/10 ohne Größe → 10", () => {
    assert.equal(fach("GiRo-Halteklammer MW30/10", "", ""), 10);
  });
  it("GiRo-Halteklammer MW30/10 M4 feuerverzinkt → 10", () => {
    assert.equal(fach("GiRo-Halteklammer MW30/10", "M4", "feuerverzinkt"), 10);
  });
  it("GiRo-Halteklammer MW30/10 M8 → 10", () => {
    assert.equal(fach("GiRo-Halteklammer MW30/10", "M8", ""), 10);
  });
  it("GiRo-Halteklammer MW30/10 M10 → 10", () => {
    assert.equal(fach("GiRo-Halteklammer MW30/10", "M10", "galvanisch"), 10);
  });
  it("Gitterrosthalteklammer → 10", () => {
    assert.equal(fach("Gitterrosthalteklammer", "", ""), 10);
  });
  it("Klemmhalter für MW30/10 → 10", () => {
    assert.equal(fach("Klemmhalter für MW30/10", "", ""), 10);
  });
  it("GiRo Halteklammer → 10", () => {
    assert.equal(fach("GiRo Halteklammer", "M8", ""), 10);
  });
  it("GiRo-Klammer → 10", () => {
    assert.equal(fach("GiRo-Klammer", "", ""), 10);
  });
  it("MW30/10 allein ohne Klammer → kein Fach 10", () => {
    assert.equal(isGitterrostHalter("Artikel MW30/10"), false);
    assert.equal(label("Artikel MW30/10", "M8", "galvanisch"), "Ohne Fachzuordnung");
  });
  it("fachfremde Klemmhalter ohne MW30 → kein Fach 10", () => {
    assert.equal(label("Klemmhalter", "", "galvanisch"), "Ohne Fachzuordnung");
  });
});

describe("Paternoster – galvanisch Kleinmaß M3–M6 → Fach 1", () => {
  it("galvanische Schraube M3 → 1", () => {
    assert.equal(fach("Sechskantschraube", "M3", "galvanisch"), 1);
  });
  it("galvanische Mutter M4 → 1", () => {
    assert.equal(fach("Mutter", "M4", "verzinkt"), 1);
  });
  it("galvanische Scheibe M5 → 1", () => {
    assert.equal(fach("Scheibe", "M5", "galvanisch"), 1);
  });
  it("galvanische Hutmutter M6 → 1", () => {
    assert.equal(fach("Hutmutter", "M6", "galvanisch"), 1);
  });
  it("galvanische Senkschraube M6 → 1", () => {
    assert.equal(fach("Senkschraube", "M6", "8.8/verzinkt"), 1);
  });
});

describe("Paternoster – Edelstahl-Kleinmaß M4–M6 → Fach 6", () => {
  it("Edelstahl Schraube M4 → 6", () => {
    assert.equal(fach("Sechskantschraube", "M4", "Edelstahl"), 6);
  });
  it("Edelstahl Mutter M5 → 6", () => {
    assert.equal(fach("Mutter", "M5", "VA"), 6);
  });
  it("Edelstahl Scheibe M6 → 6", () => {
    assert.equal(fach("Unterlegscheibe", "M6", "rostfrei"), 6);
  });
  it("A2 Senkschraube M4 → 6", () => {
    assert.equal(fach("Senkschraube", "M4", "A2"), 6);
  });
  it("A4 Hutmutter M6 → 6", () => {
    assert.equal(fach("Hutmutter", "M6", "A4"), 6);
  });
});

describe("Paternoster – Familie Edelstahl M8–M20 → Fach 5", () => {
  it("Edelstahl M8 → 5", () => {
    assert.equal(fach("Sechskantschraube", "M8", "Edelstahl"), 5);
  });
  it("Edelstahl M20 → 5", () => {
    assert.equal(fach("Sechskantschraube", "M20", "A4"), 5);
  });
  it("U-Scheibe M12 A2-70 → 5", () => {
    assert.equal(fach("U-Scheibe", "M12", "A2-70"), 5);
  });
  it("Sicherungsscheibe M16 rostfrei → 5", () => {
    assert.equal(fach("Sicherungsscheibe", "M16", "rostfrei"), 5);
  });
  it("Zylinderschraube M16 A2 → 5", () => {
    assert.equal(fach("Zylinderschraube", "M16", "A2"), 5);
  });
});

describe("Paternoster – galvanisch ab M8", () => {
  it("galvanisch M8 → 27", () => {
    assert.equal(fach("Sechskantschraube", "M8", "galvanisch"), 27);
  });
  it("galvanisch M12 → 26", () => {
    assert.equal(fach("Sechskantschraube", "M12", "galvanisch"), 26);
  });
  it("Mutter M10 verzinkt → 27", () => {
    assert.equal(fach("Mutter", "M10", "verzinkt"), 27);
  });
  it("U-Scheibe M20 galvanisch → 26", () => {
    assert.equal(fach("U-Scheibe", "M20", "galvanisch"), 26);
  });
});

describe("Paternoster – feuerverzinkt → Fach 9", () => {
  it("feuerverzinkt → 9", () => {
    assert.equal(fach("Sechskantschraube", "M10", "feuerverzinkt"), 9);
  });
  it("Mutter M20 feuerverzinkt → 9", () => {
    assert.equal(fach("Mutter", "M20", "feuerverzinkt"), 9);
  });
});

describe("Paternoster – Familie / Abgrenzung", () => {
  it("isBefestigungsFamilie", () => {
    assert.equal(isBefestigungsFamilie("Federscheibe"), true);
    assert.equal(isBefestigungsFamilie("Hutmutter"), true);
    assert.equal(isBefestigungsFamilie("Keilscheibe"), false);
    assert.equal(isBefestigungsFamilie("GiRo-Halteklammer"), false);
  });
  it("HV-Ausführung an Schraube → 26", () => {
    assert.equal(fach("Sechskantschraube", "M16", "HV"), 26);
  });
  it("verzinkter Bolzenanker → 25", () => {
    assert.equal(fach("Bolzenanker", "M12", "galvanisch"), 25);
  });
  it("Edelstahl M3 (nicht in Kleinmaßliste) → ohne Fach", () => {
    assert.equal(label("Sechskantschraube", "M3", "Edelstahl"), "Ohne Fachzuordnung");
  });
});
