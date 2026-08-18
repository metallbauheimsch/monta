/**
 * Tests: Sekundärsortierung nach Größe/Länge (Sprint 2B).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { naturalCompare, compareSizeValue, compareLengthValue, compareWithSizeSecondary } from "./sorting.js";

describe("compareSizeValue: metrische Größen numerisch, nicht alphabetisch", () => {
  it("M4..M24 sortieren in der richtigen numerischen Reihenfolge", () => {
    const sizes = ["M20", "M4", "M12", "M8", "M24", "M5", "M10", "M6", "M16", "M22", "M14", "M18"];
    const sorted = [...sizes].sort(compareSizeValue);
    assert.deepEqual(sorted, ["M4", "M5", "M6", "M8", "M10", "M12", "M14", "M16", "M18", "M20", "M22", "M24"]);
  });

  it("M10 steht nach M8 (nicht alphabetisch vor M8)", () => {
    assert.ok(compareSizeValue("M10", "M8") > 0);
  });
});

describe("compareLengthValue: Längen numerisch", () => {
  it("20 vor 100 (nicht alphabetisch)", () => {
    assert.ok(compareLengthValue("20", "100") < 0);
  });
});

function byBezeichnung(a, b) {
  return naturalCompare(a.bezeichnung, b.bezeichnung);
}

const rows = [
  { bezeichnung: "Sechskantschraube", groesse: "M16" },
  { bezeichnung: "Sechskantschraube", groesse: "M8" },
  { bezeichnung: "Sechskantschraube", groesse: "M12" },
  { bezeichnung: "Unterlegscheibe", groesse: "M20" },
  { bezeichnung: "Unterlegscheibe", groesse: "M10" },
];

function sortByBezeichnung(items, sortDir) {
  return [...items].sort((a, b) =>
    compareWithSizeSecondary(a, b, { sortKey: "bezeichnung", sortDir, compareColumn: byBezeichnung })
  );
}

describe("Primärsortierung Bezeichnung, Sekundärsortierung Größe", () => {
  it("aufsteigend: Größe innerhalb jeder Bezeichnung klein -> groß", () => {
    const sorted = sortByBezeichnung(rows, "asc").map((r) => `${r.bezeichnung} ${r.groesse}`);
    assert.deepEqual(sorted, [
      "Sechskantschraube M8",
      "Sechskantschraube M12",
      "Sechskantschraube M16",
      "Unterlegscheibe M10",
      "Unterlegscheibe M20",
    ]);
  });

  it("absteigend: Gruppenreihenfolge dreht sich um, Größe bleibt klein -> groß", () => {
    const sorted = sortByBezeichnung(rows, "desc").map((r) => `${r.bezeichnung} ${r.groesse}`);
    assert.deepEqual(sorted, [
      "Unterlegscheibe M10",
      "Unterlegscheibe M20",
      "Sechskantschraube M8",
      "Sechskantschraube M12",
      "Sechskantschraube M16",
    ]);
  });
});

describe("Primärsortierung Fach: gleiche Fachnummer -> Größe klein -> groß", () => {
  const fachRows = [
    { fach: 26, groesse: "M20" },
    { fach: 26, groesse: "M8" },
    { fach: 26, groesse: "M16" },
    { fach: 26, groesse: "M10" },
    { fach: 26, groesse: "M12" },
  ];
  function byFach(a, b) {
    return a.fach - b.fach;
  }
  it("innerhalb desselben Fachs immer aufsteigend nach Größe", () => {
    const sorted = [...fachRows]
      .sort((a, b) => compareWithSizeSecondary(a, b, { sortKey: "fach", sortDir: "asc", compareColumn: byFach }))
      .map((r) => r.groesse);
    assert.deepEqual(sorted, ["M8", "M10", "M12", "M16", "M20"]);
  });
});
