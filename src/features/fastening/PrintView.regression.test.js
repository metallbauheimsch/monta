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
});
