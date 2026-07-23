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
