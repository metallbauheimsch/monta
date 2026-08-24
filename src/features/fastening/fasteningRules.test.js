/**
 * Tests: Mitlauf-Werkstoff + nicht verfügbare Kombinationen.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMitlaufItems,
  getMitlaufForBezeichnung,
  getUnavailableFinishHint,
  isHvGarnitur,
  normalizeHvOberflaeche,
  isMetricThreadArticle,
  normalizeMetricSize,
  sizeCompareValue,
  articleIdentityKey,
} from "./fasteningRules.js";

describe("Nicht verfügbare Kombinationen (nur Hinweis)", () => {
  it("feuerverzinkte Hutmutter → Hinweis", () => {
    assert.equal(
      getUnavailableFinishHint("Hutmutter", "feuerverzinkt"),
      "Hutmuttern sind nur in galvanisch verzinkt oder Edelstahl verfügbar."
    );
  });
  it("feuerverzinkte Senkschraube → Hinweis", () => {
    assert.equal(
      getUnavailableFinishHint("Senkschraube", "feuerverzinkt"),
      "Senkschrauben sind nur in galvanisch verzinkt oder Edelstahl verfügbar."
    );
  });
  it("Senkkopfschraube feuerverzinkt → Hinweis", () => {
    assert.match(
      getUnavailableFinishHint("Senkkopfschraube", "feuerverzinkt") || "",
      /Senkschrauben/
    );
  });
  it("Hutmutter galvanisch → kein Hinweis", () => {
    assert.equal(getUnavailableFinishHint("Hutmutter", "galvanisch"), null);
  });
  it("Senkschraube Edelstahl → kein Hinweis", () => {
    assert.equal(getUnavailableFinishHint("Senkschraube", "Edelstahl"), null);
  });
  it("Sechskantschraube feuerverzinkt → kein Hinweis", () => {
    assert.equal(getUnavailableFinishHint("Sechskantschraube", "feuerverzinkt"), null);
  });
});

describe("Mitlauf übernimmt Werkstoff des Hauptartikels", () => {
  it("Edelstahl-Schraube M16 → Edelstahl-Scheibe + Mutter", () => {
    const rows = buildMitlaufItems("Sechskantschraube", {
      groesse: "M16",
      oberflaeche: "Edelstahl",
      menge: 10,
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].bezeichnung, "U-Scheibe");
    assert.equal(rows[0].oberflaeche, "Edelstahl");
    assert.equal(rows[0].groesse, "M16");
    assert.equal(rows[0].menge, 20);
    assert.equal(rows[1].bezeichnung, "Sechskantmutter");
    assert.equal(rows[1].oberflaeche, "Edelstahl");
    assert.equal(rows[1].groesse, "M16");
    assert.equal(rows[1].menge, 10);
  });
  it("galvanische Schraube M12 → galvanische Scheibe + Mutter", () => {
    const rows = buildMitlaufItems("Sechskantschraube", {
      groesse: "M12",
      oberflaeche: "galvanisch",
      menge: 4,
    });
    assert.equal(rows.length, 2);
    assert.ok(rows.every((r) => r.oberflaeche === "galvanisch"));
    assert.ok(rows.every((r) => r.groesse === "M12"));
  });
  it("feuerverzinkte Schraube M20 → feuerverzinkte Scheibe + Mutter", () => {
    const rows = buildMitlaufItems("Sechskantschraube", {
      groesse: "M20",
      oberflaeche: "feuerverzinkt",
      menge: 2,
    });
    assert.equal(rows.length, 2);
    assert.ok(rows.every((r) => r.oberflaeche === "feuerverzinkt"));
    assert.ok(rows.every((r) => r.groesse === "M20"));
  });
  it("A2-70 wird 1:1 übernommen", () => {
    const rows = buildMitlaufItems("Sechskantschraube", {
      groesse: "M10",
      oberflaeche: "A2-70",
      menge: 1,
    });
    assert.ok(rows.every((r) => r.oberflaeche === "A2-70"));
  });
  it("HV-Garnitur erzeugt keine Mitlaufartikel", () => {
    assert.equal(isHvGarnitur("HV-Garnitur"), true);
    assert.deepEqual(getMitlaufForBezeichnung("HV-Garnitur"), []);
    assert.deepEqual(
      buildMitlaufItems("HV-Garnitur", { groesse: "M16", oberflaeche: "HV", menge: 5 }),
      []
    );
  });
  it("Senkschraube: 1 Scheibe + 1 Mutter", () => {
    const rows = buildMitlaufItems("Senkschraube", {
      groesse: "M8",
      oberflaeche: "Edelstahl",
      menge: 3,
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].menge, 3);
    assert.equal(rows[1].menge, 3);
    assert.ok(rows.every((r) => r.oberflaeche === "Edelstahl"));
  });
});

describe("Größennormalisierung metrischer Gewindeartikel (Praxis-Feedback)", () => {
  it("A: Sechskantschraube M8 und m8 → gleicher Vergleichswert", () => {
    assert.equal(
      normalizeMetricSize("Sechskantschraube", "M8"),
      normalizeMetricSize("Sechskantschraube", "m8")
    );
    assert.equal(normalizeMetricSize("Sechskantschraube", "m8"), "M8");
  });

  it("B: Sechskantschraube M8 und '8' → gleicher Vergleichswert (eindeutig metrisch)", () => {
    assert.equal(
      normalizeMetricSize("Sechskantschraube", "M8"),
      normalizeMetricSize("Sechskantschraube", "8")
    );
    assert.equal(normalizeMetricSize("Sechskantschraube", "8"), "M8");
  });

  it("C: Holzschraube '8' bleibt '8', wird NICHT pauschal M8", () => {
    assert.equal(isMetricThreadArticle("Holzschraube"), false);
    assert.equal(normalizeMetricSize("Holzschraube", "8"), "8");
  });

  it("D: M12 / m12 / M 12 → gleiche fachliche Größe", () => {
    const a = normalizeMetricSize("Sechskantschraube", "M12");
    const b = normalizeMetricSize("Sechskantschraube", "m12");
    const c = normalizeMetricSize("Sechskantschraube", "M 12");
    assert.equal(a, "M12");
    assert.equal(a, b);
    assert.equal(a, c);
  });

  it("E: unterschiedliche echte metrische Größen bleiben unterschiedlich (M8 != M10)", () => {
    assert.notEqual(
      normalizeMetricSize("Sechskantschraube", "M8"),
      normalizeMetricSize("Sechskantschraube", "M10")
    );
  });

  it("weitere metrische Gewindeartikel: Mutter, Scheibe, Ankerstange, HV, Hilti HIT", () => {
    assert.equal(isMetricThreadArticle("Sechskantmutter"), true);
    assert.equal(isMetricThreadArticle("U-Scheibe"), true);
    assert.equal(isMetricThreadArticle("Ankerstange"), true);
    assert.equal(isMetricThreadArticle("HV-Garnitur"), true);
    assert.equal(isMetricThreadArticle("Hilti HIT"), true);
    assert.equal(normalizeMetricSize("Sechskantmutter", "10"), "M10");
  });

  it("Bohr-/Blech-/Betonschraube bleiben eigenständig (keine metrische Umdeutung)", () => {
    assert.equal(isMetricThreadArticle("Bohrschraube"), false);
    assert.equal(isMetricThreadArticle("Blechschraube"), false);
    assert.equal(isMetricThreadArticle("Betonschraube"), false);
    assert.equal(normalizeMetricSize("Blechschraube", "8"), "8");
  });

  it("kein pauschaler globaler Zwang: freier Text/Ausführungswert bleibt unverändert", () => {
    assert.equal(normalizeMetricSize("Sechskantschraube", "A2-70"), "A2-70");
    assert.equal(normalizeMetricSize("Sechskantschraube", ""), "");
  });

  it("sizeCompareValue macht M12 und 12 im Vergleich gleich, unabhängig von Groß-/Kleinschreibung", () => {
    assert.equal(
      sizeCompareValue("Sechskantschraube", "M12"),
      sizeCompareValue("Sechskantschraube", "12")
    );
    assert.equal(
      sizeCompareValue("Sechskantschraube", "m12"),
      sizeCompareValue("Sechskantschraube", "M 12")
    );
  });

  it("articleIdentityKey aggregiert M12- und 12-Schraube als denselben Artikel, Holzschraube 8 bleibt eigenständig", () => {
    const a = { bezeichnung: "Sechskantschraube", groesse: "M12", laenge: "50", oberflaeche: "galvanisch" };
    const b = { bezeichnung: "Sechskantschraube", groesse: "12", laenge: "50", oberflaeche: "galvanisch" };
    const c = { bezeichnung: "Sechskantschraube", groesse: "M10", laenge: "50", oberflaeche: "galvanisch" };
    const wood = { bezeichnung: "Holzschraube", groesse: "8", laenge: "50", oberflaeche: "galvanisch" };
    assert.equal(articleIdentityKey(a), articleIdentityKey(b));
    assert.notEqual(articleIdentityKey(a), articleIdentityKey(c));
    assert.equal(articleIdentityKey(wood), "holzschraube|8|50|galvanisch");
  });
});

describe("F/G: Mitlauf übernimmt vollständige, aber nie erfundene Werte", () => {
  it("F: Sechskantschraube M12/50/galvanisch → U-Scheibe/Mutter M12 galvanisch", () => {
    const rows = buildMitlaufItems("Sechskantschraube", {
      groesse: "M12",
      oberflaeche: "galvanisch",
      menge: 6,
    });
    assert.equal(rows.length, 2);
    assert.ok(rows.every((r) => r.groesse === "M12"));
    assert.ok(rows.every((r) => r.oberflaeche === "galvanisch"));
  });

  it("G: fehlende Ausgangsausführung erzeugt keinen erfundenen Wert (bleibt leer)", () => {
    const rows = buildMitlaufItems("Sechskantschraube", {
      groesse: "M12",
      oberflaeche: "",
      menge: 6,
    });
    assert.ok(rows.every((r) => r.oberflaeche === ""));
  });
});

describe("HV-Garnitur ist fachlich immer feuerverzinkt", () => {
  it("HV-Garnitur mit galvanisch → feuerverzinkt", () => {
    assert.equal(normalizeHvOberflaeche("HV-Garnitur", "galvanisch"), "feuerverzinkt");
  });
  it("HV-Garnitur mit HV → feuerverzinkt", () => {
    assert.equal(normalizeHvOberflaeche("HV-Garnitur", "HV"), "feuerverzinkt");
  });
  it("HV-Schraube (historische Schreibweise) → feuerverzinkt", () => {
    assert.equal(normalizeHvOberflaeche("HV-Schraube", "Edelstahl"), "feuerverzinkt");
  });
  it("keine HV-Garnitur → Ausführung unverändert", () => {
    assert.equal(normalizeHvOberflaeche("Sechskantschraube", "galvanisch"), "galvanisch");
    assert.equal(normalizeHvOberflaeche("Sechskantschraube", "Edelstahl"), "Edelstahl");
  });
});
