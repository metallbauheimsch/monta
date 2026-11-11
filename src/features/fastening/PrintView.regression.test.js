/**
 * Regressions-Guard: Druckansicht zeigt kein Regalfach mehr (Praxis-Sprint,
 * Abschnitt 2). Reine Quelltext-Prüfung wie bei useItemEditor.test.js Test
 * E/F - es gibt keine Component-Render-Tests in diesem Projekt.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "PrintView.jsx"), "utf8");

describe("E) PrintView zeigt keine Regalfach-Spalte mehr", () => {
  it("kein Import aus ./regalOrder", () => {
    assert.doesNotMatch(src, /from "\.\/regalOrder"/);
  });

  it("keine 'Regalfach'-Spaltenüberschrift", () => {
    assert.doesNotMatch(src, /Regalfach/);
  });

  it("Baugruppe/Bauteil-Gliederung bleibt (buildProjectStructure weiterhin verwendet)", () => {
    assert.match(src, /buildProjectStructure/);
  });

  it("Projektbezeichnung steht in der wiederholbaren Tabellenüberschrift", () => {
    assert.match(src, /printRepeatTitle/);
    assert.match(src, /projectTitle/);
  });
});

describe("Druckumbruch lässt lange Baugruppen auf der ersten Seite beginnen", () => {
  const css = fs.readFileSync(path.join(__dirname, "../../styles/style.css"), "utf8");

  it("die Baugruppe selbst wird nicht mehr komplett auf die nächste Seite geschoben", () => {
    assert.doesNotMatch(css, /\.printBaugruppeSection\{[^}]*page-break-inside:\s*avoid/);
  });

  it("Tabellenzeilen und die wiederholte Projektzeile bleiben im Druck definiert", () => {
    assert.match(css, /\.printMaterialTable tr\{[^}]*break-inside:\s*avoid/);
    assert.match(css, /\.printRepeatTitle\{display:table-row\}/);
  });
});
