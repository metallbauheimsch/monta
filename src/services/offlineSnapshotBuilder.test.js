/**
 * Tests: Offline-Snapshot-Struktur (Sprint: Lager-Offline-Praxis).
 * Reine Funktionen, keine IndexedDB/kein Browser nötig.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSnapshot,
  isValidSnapshot,
  containsForbiddenKeys,
  SNAPSHOT_SCHEMA_VERSION,
} from "./offlineSnapshotBuilder.js";
import { filterBySearch } from "../utils/textSearch.js";
import { groupBy } from "../utils/helpers.js";

const project = { id: "p1", nr: "2024-015", name: "Pergola", baugruppe: "", zeichnung: "Z-1" };
const items = [
  { id: "i1", project_id: "p1", pos: "1", einbauort: "Stütze S1|", bezeichnung: "Sechskantschraube", groesse: "M12", laenge: "40", menge: 10, bereit: 0, bestellt: false },
  { id: "i2", project_id: "p1", pos: "2", einbauort: "Stütze S1|", bezeichnung: "U-Scheibe", groesse: "M12", laenge: "", menge: 10, bereit: 0, bestellt: false },
  { id: "i3", project_id: "p2", pos: "1", einbauort: "Andere|", bezeichnung: "Sollte fehlen", groesse: "M8", laenge: "", menge: 1, bereit: 0, bestellt: false },
];
const structureRows = [
  { id: "s1", project_id: "p1", baugruppe: "Stütze S1", bauteil: null },
  { id: "s2", project_id: "p2", baugruppe: "Anderes Projekt", bauteil: null },
];

describe("K) Snapshot enthält Projekt-ID, Kurzbezeichnung, Zeitstempel und Version", () => {
  it("buildSnapshot liefert alle geforderten Metadaten", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    assert.equal(snap.projectId, "p1");
    assert.equal(snap.projectShortLabel, "Pergola");
    assert.equal(typeof snap.preparedAt, "string");
    assert.equal(Number.isNaN(Date.parse(snap.preparedAt)), false);
    assert.equal(snap.schemaVersion, SNAPSHOT_SCHEMA_VERSION);
  });

  it("nur Positionen/Struktur des ausgewählten Projekts landen im Snapshot", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    assert.equal(snap.items.length, 2);
    assert.equal(snap.items.every((i) => i.project_id === "p1"), true);
    assert.equal(snap.structureRows.length, 1);
  });

  it("wirft ohne geladenes Projekt statt einen leeren/falschen Snapshot zu erzeugen", () => {
    assert.throws(() => buildSnapshot({ project: null, items, structureRows }));
  });
});

describe("Q) Neues Vorbereiten ersetzt kontrolliert den alten Snapshot (ein Snapshot pro Gerät)", () => {
  it("jeder Snapshot verwendet denselben festen Schlüssel 'current'", () => {
    const snapA = buildSnapshot({ project, items, structureRows });
    const snapB = buildSnapshot({ project: { ...project, name: "Anderer Name" }, items, structureRows });
    assert.equal(snapA.id, "current");
    assert.equal(snapB.id, "current");
  });
});

describe("R) Keine Auth-Tokens/Secrets werden Bestandteil des Snapshots", () => {
  it("containsForbiddenKeys erkennt verdächtige Schlüssel", () => {
    assert.equal(containsForbiddenKeys({ access_token: "x" }), true);
    assert.equal(containsForbiddenKeys({ nested: { session: { apikey: "x" } } }), true);
    assert.equal(containsForbiddenKeys({ bezeichnung: "Sechskantschraube", menge: 10 }), false);
  });

  it("ein regulär gebauter Snapshot enthält keine verbotenen Schlüssel", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    assert.equal(containsForbiddenKeys(snap), false);
  });
});

describe("L) Snapshot-Daten werden durch Such-/Filter-/Sortierfunktionen nicht mutiert", () => {
  it("filterBySearch verändert weder das Snapshot-Array noch seine Objekte", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    const before = JSON.stringify(snap.items);
    filterBySearch(snap.items, "Sechskant", (i) => [i.bezeichnung]);
    assert.equal(JSON.stringify(snap.items), before);
  });

  it("Array.prototype.sort auf einer Kopie verändert die Snapshot-Reihenfolge nicht", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    const originalOrder = snap.items.map((i) => i.id);
    [...snap.items].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung));
    assert.deepEqual(snap.items.map((i) => i.id), originalOrder);
  });
});

describe("S/T) Bestehende Such- und Gruppierungslogik funktioniert unverändert auf Offline-Daten", () => {
  it("S) filterBySearch findet Positionen im Snapshot wie im Live-Betrieb", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    const found = filterBySearch(snap.items, "U-Scheibe", (i) => [i.bezeichnung]);
    assert.equal(found.length, 1);
    assert.equal(found[0].id, "i2");
  });

  it("T) groupBy gruppiert Snapshot-Positionen wie Live-Daten (z. B. nach Bezeichnung)", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    const groups = groupBy(snap.items, (i) => i.bezeichnung);
    assert.equal(Object.keys(groups).length, 2);
    assert.equal(groups["Sechskantschraube"].length, 1);
  });
});

describe("isValidSnapshot: strukturelle Prüfung vor Verwendung", () => {
  it("ein regulär gebauter Snapshot ist gültig", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    assert.equal(isValidSnapshot(snap), true);
  });

  it("null/leer/unvollständig ist ungültig", () => {
    assert.equal(isValidSnapshot(null), false);
    assert.equal(isValidSnapshot({}), false);
    assert.equal(isValidSnapshot({ projectId: "p1" }), false);
  });
});
