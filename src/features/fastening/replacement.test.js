/**
 * Tests: zentrale Ersatzlogik (Sprint 2B).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isOperationallyTouched,
  isUntouchedItem,
  isReplacedItem,
  isActiveItem,
  hasIdentityChange,
  buildReplacementFields,
} from "./replacement.js";

describe("A. Unberührte Position: bereit=0, bestellt=false", () => {
  it("gilt als unberührt -> direkte Änderung weiterhin erlaubt", () => {
    const item = { bereit: 0, bestellt: false, menge: 20, bezeichnung: "Sechskantschraube" };
    assert.equal(isOperationallyTouched(item), false);
    assert.equal(isUntouchedItem(item), true);
  });
});

describe("B. Vorbereitete Position: bereit=12", () => {
  it("gilt als operativ bearbeitet -> Ersatzlogik erforderlich", () => {
    const item = { bereit: 12, bestellt: false, menge: 20 };
    assert.equal(isOperationallyTouched(item), true);
  });
});

describe("C. Bestellte Position: bestellt=true", () => {
  it("gilt als operativ bearbeitet -> Ersatzlogik erforderlich, auch bei bereit=0", () => {
    const item = { bereit: 0, bestellt: true, menge: 20 };
    assert.equal(isOperationallyTouched(item), true);
  });
});

describe("Identitätsänderung (Bezeichnung/Größe/Länge/Ausführung)", () => {
  const current = {
    bezeichnung: "Sechskantschraube",
    groesse: "M16",
    laenge: "60",
    oberflaeche: "feuerverzinkt",
    menge: 20,
  };

  it("Größenänderung (M16x60 -> M16x70) ist eine Identitätsänderung", () => {
    assert.equal(hasIdentityChange(current, { laenge: "70" }), true);
  });

  it("reine Mengenänderung ist KEINE Identitätsänderung (gleicher Artikel, neuer Bedarf)", () => {
    assert.equal(hasIdentityChange(current, { menge: 25 }), false);
  });

  it("unveränderter Wert (z. B. erneutes Speichern derselben Bezeichnung) ist keine Änderung", () => {
    assert.equal(hasIdentityChange(current, { bezeichnung: "Sechskantschraube" }), false);
  });
});

describe("D. Neue Ersatzposition startet immer bei 0/false", () => {
  it("übernimmt fachlichen Inhalt, setzt operative Felder zurück", () => {
    const source = {
      bezeichnung: "Sechskantschraube",
      groesse: "M16",
      laenge: "60",
      oberflaeche: "feuerverzinkt",
      menge: 20,
      bereit: 12,
      bestellt: true,
      hinweis: "",
      important_note: false,
    };
    const fields = buildReplacementFields(source, { laenge: "70", menge: 20 });
    assert.equal(fields.bereit, 0);
    assert.equal(fields.bestellt, false);
    assert.equal(fields.geliefert, false);
    assert.equal(fields.laenge, "70");
    assert.equal(fields.bezeichnung, "Sechskantschraube");
    assert.equal(fields.menge, 20);
  });

  it("übernimmt nicht angegebene Felder unverändert vom Ursprung", () => {
    const source = { bezeichnung: "Sechskantschraube", groesse: "M16", laenge: "60", oberflaeche: "feuerverzinkt", menge: 20 };
    const fields = buildReplacementFields(source, { laenge: "70" });
    assert.equal(fields.bezeichnung, "Sechskantschraube");
    assert.equal(fields.groesse, "M16");
    assert.equal(fields.oberflaeche, "feuerverzinkt");
  });
});

describe("E. Altposition: ersetzt_durch gesetzt, reale Werte unverändert", () => {
  it("bereit/bestellt der Altposition werden von buildReplacementFields nicht angefasst", () => {
    // buildReplacementFields beschreibt nur die NEUE Position; die Altposition
    // wird vom Aufrufer (App.jsx replaceItem) nie mit diesen Feldern beschrieben.
    const source = { bereit: 12, bestellt: true };
    const fields = buildReplacementFields(source, { laenge: "70" });
    // fields sind die Werte der NEUEN Position, nicht die der Altposition:
    assert.equal(fields.bereit, 0);
    assert.equal(fields.bestellt, false);
    // Ursprungsobjekt selbst bleibt unverändert (keine Mutation):
    assert.equal(source.bereit, 12);
    assert.equal(source.bestellt, true);
  });
});

describe("F. Ersetzte Altposition ist kein aktueller Bedarf mehr", () => {
  it("isReplacedItem/isActiveItem erkennen ersetzt_durch korrekt", () => {
    const replaced = { id: "old", ersetzt_durch: "new-id" };
    assert.equal(isReplacedItem(replaced), true);
    assert.equal(isActiveItem(replaced), false);
  });
});

describe("G. Aktive Ersatzposition ist aktueller Bedarf", () => {
  it("Position ohne ersetzt_durch bleibt aktiv", () => {
    const active = { id: "new", ersetzt_durch: null };
    assert.equal(isReplacedItem(active), false);
    assert.equal(isActiveItem(active), true);
  });

  it("bestehende Datensätze ohne die Spalte (undefined) verhalten sich wie vor dem SQL-Patch", () => {
    const legacyRow = { id: "legacy" }; // Spalte existiert in der Live-DB evtl. noch nicht
    assert.equal(isReplacedItem(legacyRow), false);
    assert.equal(isActiveItem(legacyRow), true);
  });
});
