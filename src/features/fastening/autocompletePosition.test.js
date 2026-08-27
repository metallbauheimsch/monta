/**
 * Tests: Positionsberechnung der TB-Vorschlagsliste (Praxiskorrektur-Sprint,
 * Abschnitt 9 - Dropdown wird am Bildschirmrand abgeschnitten).
 * Reine Geometriefunktion, bewusst ohne DOM/React-Renderer testbar (wie die
 * übrigen reinen Logikmodule dieses Projekts).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeAutocompleteListPosition } from "./autocompletePosition.js";

function rect({ top, bottom, left = 20, width = 200 }) {
  return { top, bottom, left, width };
}

describe("K) genug Platz unten -> Liste öffnet nach unten (wie bisher)", () => {
  it("Eingabefeld oben im Viewport: direction=down, top direkt unter dem Feld", () => {
    const pos = computeAutocompleteListPosition({
      rect: rect({ top: 100, bottom: 130 }),
      visibleTop: 0,
      visibleBottom: 900,
      layoutHeight: 900,
    });
    assert.equal(pos.direction, "down");
    assert.equal(pos.top, 134);
    assert.equal(pos.bottom, "auto");
    assert.equal(pos.left, 20);
    assert.equal(pos.width, 200);
  });

  it("sehr viel Platz unten (großer Bildschirm): Höhe bleibt sinnvoll begrenzt statt den ganzen Bildschirm zu füllen", () => {
    const pos = computeAutocompleteListPosition({
      rect: rect({ top: 100, bottom: 130 }),
      visibleTop: 0,
      visibleBottom: 2000,
      layoutHeight: 2000,
    });
    assert.equal(pos.direction, "down");
    assert.ok(pos.maxHeight <= 480);
  });
});

describe("L) zu wenig Platz unten, aber Platz oben -> Liste öffnet nach oben", () => {
  it("Eingabefeld nahe am unteren Bildschirmrand: direction=up, bottom-Anker über dem Feld", () => {
    const pos = computeAutocompleteListPosition({
      rect: rect({ top: 850, bottom: 880 }),
      visibleTop: 0,
      visibleBottom: 900,
      layoutHeight: 900,
    });
    assert.equal(pos.direction, "up");
    assert.equal(pos.top, "auto");
    // bottom = layoutHeight - rect.top + GAP(4)
    assert.equal(pos.bottom, 900 - 850 + 4);
    assert.ok(pos.maxHeight > 0);
  });
});

describe("M) weder oben noch unten genug Platz -> begrenzte Höhe, intern scrollbar über CSS", () => {
  it("sehr kleiner sichtbarer Bereich (z. B. Tablet + Bildschirmtastatur): maxHeight bleibt positiv und sinnvoll klein", () => {
    const pos = computeAutocompleteListPosition({
      rect: rect({ top: 140, bottom: 170 }),
      visibleTop: 100,
      visibleBottom: 220,
      layoutHeight: 700,
    });
    assert.ok(pos.maxHeight > 0);
    assert.ok(pos.maxHeight < 200);
  });

  it("nutzt die größere der beiden verfügbaren Seiten statt einer festen Regel", () => {
    // mehr Platz unten (60px) als oben (10px) -> weiterhin nach unten, auch
    // wenn beide Seiten unter dem üblichen Mindestplatz liegen.
    const pos = computeAutocompleteListPosition({
      rect: rect({ top: 60, bottom: 70 }),
      visibleTop: 50,
      visibleBottom: 140,
      layoutHeight: 700,
    });
    assert.equal(pos.direction, "down");
  });
});

describe("N) Positionierungslogik ist an keinen Gerätetyp/keine feste Breite gekoppelt", () => {
  it("computeAutocompleteListPosition verwendet ausschließlich rect-/viewport-Werte, keine Bildschirmbreiten-Konstante", () => {
    // Gleiche rect-/viewport-Geometrie, unabhängig von einer angenommenen
    // Gerätebreite -> gleiches Ergebnis (Funktionssignatur kennt keine
    // Breite/Gerätekennung, nur Positionen/Höhen).
    const a = computeAutocompleteListPosition({
      rect: rect({ top: 100, bottom: 130, width: 200 }),
      visibleTop: 0,
      visibleBottom: 900,
      layoutHeight: 900,
    });
    const b = computeAutocompleteListPosition({
      rect: rect({ top: 100, bottom: 130, width: 1200 }),
      visibleTop: 0,
      visibleBottom: 900,
      layoutHeight: 900,
    });
    assert.equal(a.direction, b.direction);
  });
});
