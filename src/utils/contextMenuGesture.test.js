/**
 * Tests: Kontextmenü-Gestenlogik (Rechtsklick/Long Press) - reine
 * Hilfsfunktionen, wiederverwendet für Bauteil- UND Baugruppen-Kontextmenü
 * (Sprint: Projektnavigation). Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isPrimaryPointerDown,
  shouldCancelLongPress,
  isMenuActivationKey,
  MOVE_CANCEL_PX,
} from "./contextMenuGesture.js";

describe("isPrimaryPointerDown: nur primärer Zeiger startet Long Press", () => {
  it("Touch/Stift startet einen Long Press", () => {
    assert.equal(isPrimaryPointerDown({ pointerType: "touch", button: 0 }), true);
  });

  it("linke Maustaste startet einen Long Press", () => {
    assert.equal(isPrimaryPointerDown({ pointerType: "mouse", button: 0 }), true);
  });

  it("rechte Maustaste startet KEINEN Long Press (löst separat über onContextMenu aus)", () => {
    assert.equal(isPrimaryPointerDown({ pointerType: "mouse", button: 2 }), false);
  });

  it("mittlere Maustaste startet keinen Long Press", () => {
    assert.equal(isPrimaryPointerDown({ pointerType: "mouse", button: 1 }), false);
  });
});

describe("shouldCancelLongPress: Bewegung (z. B. Scrollen) bricht Long Press ab", () => {
  it("keine Bewegung -> kein Abbruch", () => {
    assert.equal(shouldCancelLongPress({ x: 10, y: 10 }, { x: 10, y: 10 }), false);
  });

  it("Bewegung genau an der Toleranzgrenze -> kein Abbruch", () => {
    assert.equal(shouldCancelLongPress({ x: 10, y: 10 }, { x: 10 + MOVE_CANCEL_PX, y: 10 }), false);
  });

  it("Bewegung über die Toleranz hinaus -> Abbruch (kein versehentliches Öffnen beim Scrollen)", () => {
    assert.equal(shouldCancelLongPress({ x: 10, y: 10 }, { x: 10 + MOVE_CANCEL_PX + 1, y: 10 }), true);
  });

  it("Abbruch gilt auch für vertikale Bewegung", () => {
    assert.equal(shouldCancelLongPress({ x: 10, y: 10 }, { x: 10, y: 10 + MOVE_CANCEL_PX + 1 }), true);
  });
});

describe("isMenuActivationKey: Enter/Leertaste öffnen dasselbe Kontextmenü (Accessibility)", () => {
  it("Enter aktiviert", () => {
    assert.equal(isMenuActivationKey("Enter"), true);
  });

  it("Leertaste aktiviert", () => {
    assert.equal(isMenuActivationKey(" "), true);
  });

  it("ältere Browser: 'Spacebar' aktiviert ebenfalls", () => {
    assert.equal(isMenuActivationKey("Spacebar"), true);
  });

  it("andere Tasten aktivieren nicht (z. B. Tab, Pfeiltasten)", () => {
    assert.equal(isMenuActivationKey("Tab"), false);
    assert.equal(isMenuActivationKey("ArrowDown"), false);
    assert.equal(isMenuActivationKey("Escape"), false);
  });
});
