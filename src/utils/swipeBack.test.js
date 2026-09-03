/**
 * Tests: Randwischen = Zurück (Tablet-Navigation) - reine
 * Schwellwert-Funktionen, analog zu contextMenuGesture.test.js.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isEdgeSwipeStart, isValidSwipeBack, EDGE_ZONE_PX, MIN_HORIZONTAL_PX, MAX_VERTICAL_PX } from "./swipeBack.js";

describe("isEdgeSwipeStart: Geste muss nahe am linken Rand beginnen", () => {
  it("Start direkt am Rand (x=0) zählt", () => {
    assert.equal(isEdgeSwipeStart(0), true);
  });

  it("Start an der Randzonen-Grenze zählt noch", () => {
    assert.equal(isEdgeSwipeStart(EDGE_ZONE_PX), true);
  });

  it("Start knapp außerhalb der Randzone zählt nicht (Test B: mitten in Tabelle)", () => {
    assert.equal(isEdgeSwipeStart(EDGE_ZONE_PX + 1), false);
  });

  it("Start mitten im Bildschirm zählt nicht", () => {
    assert.equal(isEdgeSwipeStart(400), false);
  });
});

describe("isValidSwipeBack: deutliche Rechtsbewegung, wenig vertikale Abweichung", () => {
  it("Test A: Rand + ausreichend horizontal, kaum vertikal -> gültig", () => {
    assert.equal(
      isValidSwipeBack({ x: 5, y: 300 }, { x: 5 + MIN_HORIZONTAL_PX, y: 300 }),
      true
    );
  });

  it("zu kurze Horizontalbewegung -> ungültig", () => {
    assert.equal(
      isValidSwipeBack({ x: 5, y: 300 }, { x: 5 + MIN_HORIZONTAL_PX - 1, y: 300 }),
      false
    );
  });

  it("Test C: überwiegend vertikale Bewegung (Scrollen) -> ungültig", () => {
    assert.equal(
      isValidSwipeBack(
        { x: 5, y: 300 },
        { x: 5 + MIN_HORIZONTAL_PX, y: 300 + MAX_VERTICAL_PX + 1 }
      ),
      false
    );
  });

  it("Bewegung nach links (negatives dx) -> ungültig", () => {
    assert.equal(isValidSwipeBack({ x: 100, y: 300 }, { x: 20, y: 300 }), false);
  });

  it("vertikale Abweichung genau an der Toleranzgrenze -> noch gültig", () => {
    assert.equal(
      isValidSwipeBack(
        { x: 5, y: 300 },
        { x: 5 + MIN_HORIZONTAL_PX, y: 300 + MAX_VERTICAL_PX }
      ),
      true
    );
  });
});

describe("Test D (Desktop-Maus): useSwipeBack reagiert nur auf pointerType 'touch'", () => {
  it("Quellcode prüft pointerType 'touch' vor jeder Aktivierung (Regressions-Guard)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("./swipeBack.js", import.meta.url), "utf8");
    assert.match(src, /pointerType !== "touch"/);
  });
});
