/**
 * Tests: projektweite Navigation (Sprint: Projektnavigation).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projectWideTabsFor, PROJECT_WIDE_TAB_ORDER } from "./tabs.js";

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
