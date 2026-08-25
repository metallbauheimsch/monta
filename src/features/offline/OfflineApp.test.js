/**
 * Tests: Offline-Ansicht ist strukturell read-only (Sprint: Lager-Offline-
 * Praxis, Testfall M). Quell-Prüfung statt Rendering, da kein React-
 * Test-Renderer im Projekt vorhanden ist (siehe restliche Tests dieses
 * Projekts, ebenfalls reine Funktions-/Quelltests).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("M) Offline-Modus ist read-only", () => {
  it("OfflineApp.jsx ruft keine schreibenden Funktionen auf (kein update/insert/delete, kein supabase)", () => {
    const source = readFileSync(path.join(dir, "OfflineApp.jsx"), "utf8");
    assert.equal(/updateItem|addItem|deleteItem|replaceItem|supabase/i.test(source), false);
  });

  it("OfflineApp.jsx bindet AuthProvider/AuthContext nicht ein (kein Auth-Lifecycle im Offline-Zweig)", () => {
    const source = readFileSync(path.join(dir, "OfflineApp.jsx"), "utf8");
    // Nur tatsächliche Code-Verwendung prüfen (Import/JSX), nicht die
    // erklärenden Kommentare, die AuthContext bewusst zur Begründung nennen.
    assert.equal(/from ["'].*auth\/AuthContext["']/i.test(source), false);
    assert.equal(/<AuthProvider|useAuth\(/.test(source), false);
  });

  it("PrintView selbst führt keine Schreiboperationen aus (bereits die bestehende, wiederverwendete Ansicht)", () => {
    const source = readFileSync(
      path.join(dir, "..", "fastening", "PrintView.jsx"),
      "utf8"
    );
    assert.equal(/updateItem|addItem|deleteItem|replaceItem\(/i.test(source), false);
  });
});
