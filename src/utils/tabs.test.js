/**
 * Tests: projektweite Navigation (Sprint: Projektnavigation).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  projectWideTabsFor,
  PROJECT_WIDE_TAB_ORDER,
  tabForBauteilOpen,
  visibleTabsFor,
  resolveTabFullAccess,
  TAB_ORDER,
} from "./tabs.js";

describe("visibleTabsFor/projectWideTabsFor: Reiter sind auf jedem Gerät erreichbar (Praxistest-Korrektur)", () => {
  it("visibleTabsFor liefert immer alle Reiter - kein Viewport-Parameter mehr, der etwas ausblenden könnte", () => {
    assert.equal(visibleTabsFor.length, 0);
    assert.deepEqual(visibleTabsFor(), TAB_ORDER);
  });

  it("H) Viewport-Breite allein entfernt keinen fachlich erlaubten Reiter", () => {
    // Frühere Aufrufer übergaben (isNarrow, {fullAccess}) - selbst mit
    // solchen (jetzt wirkungslosen) Argumenten bleibt das Ergebnis gleich.
    assert.deepEqual(visibleTabsFor(true, { fullAccess: false }), TAB_ORDER);
  });

  it("I) 'Prüfung' bleibt auch ohne Vollzugriff erreichbar, insbesondere im Tablet-Hochformat", () => {
    assert.equal(visibleTabsFor().includes("pruefung"), true);
    assert.equal(projectWideTabsFor().includes("pruefung"), true);
  });

  it("projektweite Navigation bietet genau Prüfung/Lager/Warenkorb/Druck", () => {
    assert.deepEqual(projectWideTabsFor(), ["pruefung", "material", "bestellliste", "druck"]);
  });

  it("TB ist NIEMALS Bestandteil der projektweiten Navigation", () => {
    assert.equal(PROJECT_WIDE_TAB_ORDER.includes("tb"), false);
    assert.equal(projectWideTabsFor().includes("tb"), false);
  });
});

describe("J) Berechtigungen wirken weiterhin unabhängig vom Viewport", () => {
  it("resolveTabFullAccess kennt keinen Viewport-Parameter und bleibt reine Berechtigungsprüfung", () => {
    assert.equal(resolveTabFullAccess({ hasFullModuleAccess: true }), true);
    assert.equal(resolveTabFullAccess({ hasFullModuleAccess: false, session: null }), false);
  });
});

describe("tabForBauteilOpen: Reiterzustand beim Bauteilwechsel (Praxistest-Korrektur)", () => {
  // A) Kein vorheriger Reiter -> neues Bauteil öffnet TB (Desktop/Vollzugriff)
  it("A: ohne gemerkten Reiter öffnet TB (Standard wie bisher, Desktop/Vollzugriff)", () => {
    assert.equal(tabForBauteilOpen(null, false, { fullAccess: true }), "tb");
  });

  it("A: ohne gemerkten Reiter öffnet Lager auf schmalen Geräten ohne Vollzugriff (Standard wie bisher)", () => {
    assert.equal(tabForBauteilOpen(null, true, { fullAccess: false }), "material");
  });

  // B–F) S1 [Reiter] -> S2 öffnen -> [Reiter] bleibt aktiv
  it("B: S1 Lager -> S2 öffnen -> Lager bleibt aktiv", () => {
    assert.equal(tabForBauteilOpen("material", false, { fullAccess: true }), "material");
  });

  it("C: S1 Prüfung -> S2 öffnen -> Prüfung bleibt aktiv", () => {
    assert.equal(tabForBauteilOpen("pruefung", false, { fullAccess: true }), "pruefung");
  });

  it("D: S1 Warenkorb -> S2 öffnen -> Warenkorb bleibt aktiv", () => {
    assert.equal(tabForBauteilOpen("bestellliste", false, { fullAccess: true }), "bestellliste");
  });

  it("E: S1 Druck -> S2 öffnen -> Druck bleibt aktiv", () => {
    assert.equal(tabForBauteilOpen("druck", false, { fullAccess: true }), "druck");
  });

  it("F: S1 TB -> S2 öffnen -> TB bleibt aktiv", () => {
    assert.equal(tabForBauteilOpen("tb", false, { fullAccess: true }), "tb");
  });

  it("gemerkter Reiter hat auch auf schmalen Geräten Vorrang vor dem Standard", () => {
    assert.equal(tabForBauteilOpen("druck", true, { fullAccess: false }), "druck");
  });
});
