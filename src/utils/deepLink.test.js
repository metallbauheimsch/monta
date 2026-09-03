/**
 * Tests: Deep-Link aus Workflow-Mails (Praxis-Sprint) - reine
 * Parsing-Logik. Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDeepLinkParams } from "./deepLink.js";

describe("parseDeepLinkParams: gültige Deep-Links", () => {
  it("Projekt + gültiger projektweiter Reiter werden erkannt", () => {
    assert.deepEqual(parseDeepLinkParams("?project=abc-123&tab=material"), {
      projectId: "abc-123",
      tab: "material",
    });
  });

  it("funktioniert für alle projektweiten Reiter (pruefung/material/bestellliste/druck)", () => {
    for (const tab of ["pruefung", "material", "bestellliste", "druck"]) {
      assert.deepEqual(parseDeepLinkParams(`?project=p1&tab=${tab}`), { projectId: "p1", tab });
    }
  });
});

describe("Test T: ungültige/fehlende Parameter führen sicher zur normalen App", () => {
  it("kein project-Parameter -> null", () => {
    assert.equal(parseDeepLinkParams("?tab=material"), null);
  });

  it("kein tab-Parameter -> null", () => {
    assert.equal(parseDeepLinkParams("?project=abc"), null);
  });

  it("leerer Such-String -> null", () => {
    assert.equal(parseDeepLinkParams(""), null);
  });

  it("undefined -> null (kein Absturz)", () => {
    assert.equal(parseDeepLinkParams(undefined), null);
  });

  it("'tb' ist kein gültiges Deep-Link-Ziel (braucht zusätzlich Baugruppe/Bauteil)", () => {
    assert.equal(parseDeepLinkParams("?project=abc&tab=tb"), null);
  });

  it("unbekannter Reiter -> null", () => {
    assert.equal(parseDeepLinkParams("?project=abc&tab=unbekannt"), null);
  });
});
