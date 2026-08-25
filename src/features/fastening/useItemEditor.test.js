/**
 * Tests: Lager-Direktbearbeitung (Sprint: Lager-Offline-Praxis).
 * Die zentrale Entscheidungslogik (needsReplacement,
 * mengeIncreaseNeedsBestelltReset, isReplacedItem) ist bereits über
 * replacement.test.js breit abgesichert - useItemEditor.js verwendet sie
 * unverändert (siehe TechnikerEditor.jsx und LagerView.jsx, beide nutzen
 * jetzt denselben Hook). Hier zusätzlich aus Lager-Sicht (eine konkrete
 * Ursprungsposition einer aggregierten Zeile) sowie die strukturelle
 * Wiederverwendung selbst, damit keine zweite, abweichende Lagerlogik
 * unbemerkt entsteht.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { needsReplacement, mengeIncreaseNeedsBestelltReset, isReplacedItem } from "./replacement.js";
import { remainingQty } from "../../utils/helpers.js";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("Lager-Direktbearbeitung: EIN Änderungsmodell mit TB", () => {
  it("A) unberührte Lagerposition (bereit=0, bestellt=false): direkte fachliche Änderung möglich", () => {
    const source = {
      bereit: 0,
      bestellt: false,
      bezeichnung: "Sechskantschraube",
      groesse: "M12",
      laenge: "40",
      oberflaeche: "feuerverzinkt",
    };
    assert.equal(needsReplacement(source, { groesse: "M16" }), false);
  });

  it("B) operativ bearbeitete Lagerposition + Identitätsänderung: bestehende Ersatzlogik erforderlich", () => {
    const source = {
      bereit: 5,
      bestellt: false,
      bezeichnung: "Sechskantschraube",
      groesse: "M12",
      laenge: "40",
      oberflaeche: "feuerverzinkt",
    };
    assert.equal(needsReplacement(source, { groesse: "M16" }), true);
  });

  it("C) bestellte Lagerposition + Mengenerhöhung: bestehende Warn-/Resetlogik greift, keine Ersatzlogik", () => {
    const source = { menge: 20, bestellt: true, bereit: 0 };
    assert.equal(mengeIncreaseNeedsBestelltReset(source, { menge: 30 }), true);
    // Reine Mengenerhöhung ist keine Identitätsänderung -> kein Ersatz nötig.
    assert.equal(needsReplacement(source, { menge: 30 }), false);
  });

  it("D) Mengenreduzierung: bestehende bereit-/Restmengen-Regeln bleiben unverändert", () => {
    const item = { menge: 8, bereit: 12 };
    assert.equal(remainingQty(item), 0); // Restmenge nie negativ
    assert.equal(item.bereit, 12); // bereit selbst bleibt unangetastet
  });

  it("E) separate Lager-'Ersetzen'-UI ist nicht mehr erforderlich - LagerView nutzt ausschließlich useItemEditor", () => {
    const lagerViewSource = readFileSync(path.join(dir, "LagerView.jsx"), "utf8");
    assert.match(lagerViewSource, /from "\.\/useItemEditor"/);
    assert.equal(/LagerReplacePanel/.test(lagerViewSource), false, "LagerReplacePanel darf nicht mehr referenziert werden");
  });

  it("F) historische Ersatzposition wird nicht direkt überschrieben (zentraler Schutz in useItemEditor)", () => {
    const replaced = { ersetzt_durch: "new-id", bereit: 5, bestellt: true };
    assert.equal(isReplacedItem(replaced), true);
    const editorSource = readFileSync(path.join(dir, "useItemEditor.js"), "utf8");
    assert.match(editorSource, /if \(isReplacedItem\(current\)\) return;/);
  });

  it("TechnikerEditor.jsx verwendet denselben useItemEditor (keine zweite Implementierung)", () => {
    const tbSource = readFileSync(path.join(dir, "TechnikerEditor.jsx"), "utf8");
    assert.match(tbSource, /from "\.\/useItemEditor"/);
  });
});
