/**
 * Tests: Online/Offline-Startentscheidung (Sprint: Lager-Offline-Praxis).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideOfflineState, OFFLINE_STATE } from "./offlineState.js";
import { buildSnapshot } from "./offlineSnapshotBuilder.js";

const project = { id: "p1", nr: "2024-015", name: "Pergola" };
const validSnapshot = buildSnapshot({ project, items: [], structureRows: [] });

describe("P) Online-Modus bevorzugt immer Live-Daten, nicht den Snapshot", () => {
  it("online + Snapshot vorhanden -> trotzdem 'online' (Live-App startet wie bisher)", () => {
    assert.equal(decideOfflineState({ isOnline: true, snapshot: validSnapshot }), OFFLINE_STATE.ONLINE);
  });

  it("online + kein Snapshot -> 'online'", () => {
    assert.equal(decideOfflineState({ isOnline: true, snapshot: null }), OFFLINE_STATE.ONLINE);
  });
});

describe("N) Offline ohne Snapshot ergibt einen klaren Zustand", () => {
  it("offline + kein Snapshot -> OFFLINE_NO_SNAPSHOT", () => {
    assert.equal(decideOfflineState({ isOnline: false, snapshot: null }), OFFLINE_STATE.OFFLINE_NO_SNAPSHOT);
  });

  it("offline + strukturell ungültiger Snapshot -> ebenfalls OFFLINE_NO_SNAPSHOT (kein Absturz)", () => {
    assert.equal(
      decideOfflineState({ isOnline: false, snapshot: { unvollständig: true } }),
      OFFLINE_STATE.OFFLINE_NO_SNAPSHOT
    );
  });
});

describe("O) Offline mit gültigem Snapshot kann den Projektstand laden", () => {
  it("offline + gültiger Snapshot -> OFFLINE_WITH_SNAPSHOT", () => {
    assert.equal(
      decideOfflineState({ isOnline: false, snapshot: validSnapshot }),
      OFFLINE_STATE.OFFLINE_WITH_SNAPSHOT
    );
  });
});
