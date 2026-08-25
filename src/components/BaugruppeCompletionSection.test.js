/**
 * Tests: Abschluss-UI im projektweiten Zugang (Praxiskorrektur-Sprint).
 * Quelltext-Prüfung statt Rendering, da kein React-Test-Renderer im
 * Projekt vorhanden ist (wie bei den übrigen Tests dieses Projekts).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const featuresDir = path.join(dir, "..", "features", "fastening");

describe("A) projectWide rendert NICHT automatisch eine Abschlusscheckbox je Baugruppe", () => {
  it("BaugruppeCompletionSection iteriert nicht mehr über eine Liste von Baugruppen", () => {
    const source = readFileSync(path.join(dir, "BaugruppeCompletionSection.jsx"), "utf8");
    assert.equal(/\.map\(/.test(source), false, "keine Liste/Iteration über Baugruppen mehr erlaubt");
  });

  it("ohne Baugruppen-Kontext wird explizit nichts gerendert (früher Abbruch)", () => {
    const source = readFileSync(path.join(dir, "BaugruppeCompletionSection.jsx"), "utf8");
    assert.match(source, /if \(!setBaugruppeCompletion \|\| !project \|\| !baugruppe\) return null;/);
  });
});

describe("B) projectWide verwendet denselben bestehenden Abschlussweg wie der normale Zugang", () => {
  it("Checks.jsx (Prüfung) verwendet BaugruppeCompletionSection - keine zweite Implementierung", () => {
    const source = readFileSync(path.join(featuresDir, "Checks.jsx"), "utf8");
    assert.match(source, /from "\.\.\/\.\.\/components\/BaugruppeCompletionSection"/);
    assert.match(source, /<BaugruppeCompletionSection/);
  });

  it("LagerView.jsx (Lager) verwendet BaugruppeCompletionSection - keine zweite Implementierung", () => {
    const source = readFileSync(path.join(featuresDir, "LagerView.jsx"), "utf8");
    assert.match(source, /from "\.\.\/\.\.\/components\/BaugruppeCompletionSection"/);
    assert.match(source, /<BaugruppeCompletionSection/);
  });

  it("beide rufen ausschließlich das bestehende setBaugruppeCompletion() auf, keine neue Funktion", () => {
    const checksSource = readFileSync(path.join(featuresDir, "Checks.jsx"), "utf8");
    const lagerSource = readFileSync(path.join(featuresDir, "LagerView.jsx"), "utf8");
    assert.match(checksSource, /setBaugruppeCompletion={setBaugruppeCompletion}/);
    assert.match(lagerSource, /setBaugruppeCompletion={setBaugruppeCompletion}/);
  });
});
