/**
 * Tests: Offline-Snapshot-Struktur (Sprint: Lager-Offline-Praxis).
 * Reine Funktionen, keine IndexedDB/kein Browser nötig.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildSnapshot,
  isValidSnapshot,
  containsForbiddenKeys,
  snapshotMatchesProject,
  offlinePrepareButtonLabel,
  SNAPSHOT_SCHEMA_VERSION,
} from "./offlineSnapshotBuilder.js";
import { filterBySearch } from "../utils/textSearch.js";
import { groupBy } from "../utils/helpers.js";

const dir = path.dirname(fileURLToPath(import.meta.url));

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

describe("C/D) Persistenter Offline-Status wird aus dem gespeicherten Snapshot angezeigt", () => {
  it("C) ein gespeicherter, zum aktuellen Projekt passender Snapshot gilt als 'vorbereitet'", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    assert.equal(snapshotMatchesProject(snap, "p1"), true);
  });

  it("D) preparedAt des geladenen Snapshots wird unverändert für die Anzeige übernommen", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    // Simuliert das erneute Laden aus IndexedDB (loadSnapshot()) - dieselben Metadaten.
    const loaded = { ...snap };
    assert.equal(loaded.preparedAt, snap.preparedAt);
    assert.equal(Number.isNaN(Date.parse(loaded.preparedAt)), false);
  });

  it("ein Snapshot eines ANDEREN Projekts gilt nicht als 'vorbereitet' für das aktuell geöffnete", () => {
    const snap = buildSnapshot({ project, items, structureRows });
    assert.equal(snapshotMatchesProject(snap, "p2-anderes-projekt"), false);
  });

  it("kein Snapshot -> nicht 'vorbereitet'", () => {
    assert.equal(snapshotMatchesProject(null, "p1"), false);
  });
});

describe("E/F) Button-Beschriftung: 'vorbereiten' ohne, 'aktualisieren' mit passendem Snapshot", () => {
  it("E) ohne passenden Snapshot: 'Offline-Modus vorbereiten'", () => {
    assert.equal(offlinePrepareButtonLabel(false), "Offline-Modus vorbereiten");
  });

  it("F) mit passendem Snapshot: 'Offline-Stand aktualisieren'", () => {
    assert.equal(offlinePrepareButtonLabel(true), "Offline-Stand aktualisieren");
  });
});

describe("H) Online-Anzeige verwendet 'Offline vorbereitet', nicht 'OFFLINE' als aktiven Zustand", () => {
  it("OfflinePrepareButton.jsx zeigt 'Offline vorbereitet' und nicht das Wort 'OFFLINE' als Status", () => {
    const source = readFileSync(
      path.join(dir, "..", "features", "fastening", "OfflinePrepareButton.jsx"),
      "utf8"
    );
    // Kommentare (Erklärung, warum "OFFLINE" bewusst NICHT verwendet wird)
    // vor der Prüfung entfernen - nur tatsächlicher Anzeige-Code zählt.
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.match(codeOnly, /Offline vorbereitet/);
    assert.equal(/OFFLINE/.test(codeOnly), false);
  });
});

describe("G) Reiterwechsel (erneutes Mounten) verändert/löscht den Snapshot nicht", () => {
  it("OfflinePrepareButton.jsx liest beim Mounten nur (loadSnapshot), schreibt nur im bewussten Klick-Handler (saveSnapshot)", () => {
    const source = readFileSync(
      path.join(dir, "..", "features", "fastening", "OfflinePrepareButton.jsx"),
      "utf8"
    );
    const saveSnapshotCalls = (source.match(/saveSnapshot\(/g) || []).length;
    const loadSnapshotCalls = (source.match(/loadSnapshot\(/g) || []).length;
    assert.equal(saveSnapshotCalls, 1, "saveSnapshot darf nur einmal aufgerufen werden - im Klick-Handler");
    assert.equal(loadSnapshotCalls, 1, "loadSnapshot darf nur einmal aufgerufen werden - beim Mounten");

    const saveIndex = source.indexOf("saveSnapshot(");
    const before = source.slice(0, saveIndex);
    const lastHandlerStart = before.lastIndexOf("async function handlePrepare");
    const lastEffectStart = before.lastIndexOf("useEffect(");
    assert.ok(
      lastHandlerStart > lastEffectStart,
      "saveSnapshot() muss im Klick-Handler stehen, nicht im Mount-Effekt"
    );
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
