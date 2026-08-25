/**
 * Tests: projektweite Navigation (Sprint: Projektnavigation).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projectWideTabsFor, PROJECT_WIDE_TAB_ORDER, tabForBauteilOpen } from "./tabs.js";

describe("projectWideTabsFor: Projektübersicht bietet genau die projektweiten Ziele", () => {
  it("bietet bei Vollzugriff genau Prüfung/Lager/Warenkorb/Druck", () => {
    assert.deepEqual(projectWideTabsFor(false, { fullAccess: true }), [
      "pruefung",
      "material",
      "bestellliste",
      "druck",
    ]);
  });

  it("TB ist NIEMALS Bestandteil der projektweiten Navigation", () => {
    assert.equal(PROJECT_WIDE_TAB_ORDER.includes("tb"), false);
    assert.equal(projectWideTabsFor(false, { fullAccess: true }).includes("tb"), false);
    assert.equal(projectWideTabsFor(true, { fullAccess: false }).includes("tb"), false);
    assert.equal(projectWideTabsFor(true, { fullAccess: true }).includes("tb"), false);
  });

  it("auf schmalen Geräten ohne Vollzugriff bleibt Prüfung ausgeblendet (wie TB/Prüfung generell)", () => {
    assert.deepEqual(projectWideTabsFor(true, { fullAccess: false }), [
      "material",
      "bestellliste",
      "druck",
    ]);
  });

  it("auf schmalen Geräten MIT Vollzugriff bleibt Prüfung sichtbar", () => {
    const tabs = projectWideTabsFor(true, { fullAccess: true });
    assert.equal(tabs.includes("pruefung"), true);
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
