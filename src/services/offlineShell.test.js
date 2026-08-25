/**
 * Tests: App-Shell-Startgarantie (Sprint: Lager-Offline-Praxis, GPT-Review-
 * Korrektur "Offline-Startgarantie"). Reine Funktionen bzw. Quelltext-
 * Prüfung, da Service Worker/Cache Storage/fetch nicht ohne echten
 * Browser sinnvoll mockbar sind (wie bei den übrigen Tests dieses
 * Projekts: reine Logik statt Rendering/Browser-APIs testen).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { isOfflinePrepareSuccessful, isSameOriginUrl, CACHE_NAME } from "./offlineShell.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const ORIGIN = "https://monta.example.com";

describe("A) Offline-Vorbereitung meldet Erfolg nur, wenn Snapshot UND App-Shell erfolgreich sind", () => {
  it("beides erfolgreich -> Erfolg", () => {
    assert.equal(isOfflinePrepareSuccessful({ snapshotOk: true, shellOk: true }), true);
  });
});

describe("B) Snapshot erfolgreich + Shell fehlgeschlagen -> kein Erfolg", () => {
  it("Shell fehlgeschlagen verhindert die 'WLAN/Hotspot ausschalten'-Bestätigung", () => {
    assert.equal(isOfflinePrepareSuccessful({ snapshotOk: true, shellOk: false }), false);
  });
});

describe("C) Shell erfolgreich + Snapshot fehlgeschlagen -> ebenfalls kein Erfolg", () => {
  it("Snapshot fehlgeschlagen verhindert die Bestätigung, obwohl die Shell bereit wäre", () => {
    assert.equal(isOfflinePrepareSuccessful({ snapshotOk: false, shellOk: true }), false);
  });

  it("beides fehlgeschlagen -> erst recht kein Erfolg", () => {
    assert.equal(isOfflinePrepareSuccessful({ snapshotOk: false, shellOk: false }), false);
  });
});

describe("D) Keine Supabase-/Cross-Origin-Antworten werden gecacht", () => {
  it("same-origin Ressourcen (App-Shell) gelten als cachbar", () => {
    assert.equal(isSameOriginUrl("/assets/index-abc123.js", ORIGIN), true);
    assert.equal(isSameOriginUrl(`${ORIGIN}/index.html`, ORIGIN), true);
  });

  it("fremde Origin (z. B. Supabase) gilt NICHT als cachbar", () => {
    assert.equal(isSameOriginUrl("https://xyzcompany.supabase.co/rest/v1/material_items", ORIGIN), false);
    assert.equal(isSameOriginUrl("https://xyzcompany.supabase.co/auth/v1/token", ORIGIN), false);
  });

  it("ungültige URLs gelten sicherheitshalber als nicht cachbar statt einen Fehler zu werfen", () => {
    assert.equal(isSameOriginUrl(null, ORIGIN), false);
    assert.equal(isSameOriginUrl(undefined, ORIGIN), false);
  });

  it("public/sw.js schließt fremde Origins ebenfalls explizit von der Cache-Strategie aus", () => {
    const swSource = readFileSync(path.join(dir, "..", "..", "public", "sw.js"), "utf8");
    assert.match(swSource, /url\.origin\s*!==\s*self\.location\.origin/);
  });
});

describe("E) AuthContext bleibt außerhalb des Offline-Bootstraps", () => {
  it("offlineShell.js bindet AuthContext/AuthProvider nicht ein", () => {
    const source = readFileSync(path.join(dir, "offlineShell.js"), "utf8");
    assert.equal(/auth\/AuthContext|AuthProvider|useAuth\(/i.test(source), false);
  });

  it("OfflinePrepareButton.jsx bindet AuthContext/AuthProvider nicht ein", () => {
    const source = readFileSync(
      path.join(dir, "..", "features", "fastening", "OfflinePrepareButton.jsx"),
      "utf8"
    );
    assert.equal(/auth\/AuthContext|AuthProvider|useAuth\(/i.test(source), false);
  });
});

describe("Cache-Versionierung: offlineShell.js und public/sw.js verwenden denselben Cache-Namen", () => {
  it("CACHE_NAME aus offlineShell.js kommt in public/sw.js identisch vor (kein stiller Versions-Drift)", () => {
    const swSource = readFileSync(path.join(dir, "..", "..", "public", "sw.js"), "utf8");
    assert.match(swSource, new RegExp(`CACHE_NAME\\s*=\\s*["']${CACHE_NAME}["']`));
  });
});
