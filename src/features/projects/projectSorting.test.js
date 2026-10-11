/**
 * Tests: Sortierung der Projektübersicht und getrennter Archivbereich
 * (Sprint 1). Reine Funktionen aus projectSorting.js.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  ACTIVE_SORT_MODES,
  DEFAULT_ACTIVE_SORT,
  isArchiveToggleVisible,
  sortActiveProjects,
  sortArchivedProjects,
  splitProjects,
  toggleSortDir,
} from "./projectSorting.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const names = (list) => list.map((p) => p.name);

// Projekte mit eindeutigem Status über ihre Positionen.
const projects = [
  { id: "1", nr: "101", name: "Pergola", created_at: "2026-03-01T10:00:00Z" },
  { id: "2", nr: "102", name: "Balkon", created_at: "2026-05-01T10:00:00Z" },
  { id: "3", nr: "103", name: "Überdachung", created_at: "2026-01-01T10:00:00Z" },
  { id: "4", nr: "104", name: "Carport", created_at: "2026-04-01T10:00:00Z" },
  { id: "5", nr: "105", name: "Ährenweg Geländer", created_at: "2026-02-01T10:00:00Z" },
  { id: "6", nr: "106", name: "Anbau", created_at: "2026-06-01T10:00:00Z" },
];
const it_ = (pid, o) => ({ id: `${pid}-${Math.random()}`, project_id: pid, menge: 10, bereit: 0, bestellt: false, ...o });
const items = [
  it_("1", { bereit: 10 }), // bereit
  it_("2", { bereit: 0, bestellt: false }), // offen
  it_("3", { bereit: 0, bestellt: true }), // bestellt
  // "4" Carport: keine Positionen
  it_("5", { bereit: 0, bestellt: false }), // offen
  it_("6", { bereit: 10 }), // bereit
];

describe("Sortierauswahl aktive Projekte", () => {
  it("bietet genau Status, Erstellungsdatum und A–Z an, Standard ist 'Nach Status'", () => {
    assert.deepEqual(ACTIVE_SORT_MODES.map((m) => m.key), ["status", "created", "name"]);
    assert.equal(DEFAULT_ACTIVE_SORT, "status");
  });
});

describe("Nach Status: Rot -> Gelb -> Grün -> Grau, innerhalb der Gruppe A–Z", () => {
  it("Reihenfolge offen, bestellt, bereit, keine Positionen", () => {
    assert.deepEqual(names(sortActiveProjects(projects, items, "status")), [
      "Ährenweg Geländer", // offen
      "Balkon", // offen
      "Überdachung", // bestellt
      "Anbau", // bereit
      "Pergola", // bereit
      "Carport", // keine Positionen
    ]);
  });

  it("ist der Standard, wenn kein Modus übergeben wird", () => {
    assert.deepEqual(sortActiveProjects(projects, items), sortActiveProjects(projects, items, "status"));
  });
});

describe("Nach Erstellungsdatum: neueste zuerst", () => {
  it("sortiert absteigend nach created_at", () => {
    assert.deepEqual(names(sortActiveProjects(projects, items, "created")), [
      "Anbau",
      "Balkon",
      "Carport",
      "Pergola",
      "Ährenweg Geländer",
      "Überdachung",
    ]);
  });

  it("gleiches Datum -> A–Z, fehlendes/ungültiges Datum -> ans Ende", () => {
    const list = [
      { id: "a", name: "Zaun", created_at: "2026-01-01T00:00:00Z" },
      { id: "b", name: "Alt", created_at: null },
      { id: "c", name: "Bühne", created_at: "2026-01-01T00:00:00Z" },
      { id: "d", name: "Kaputt", created_at: "kein Datum" },
    ];
    assert.deepEqual(names(sortActiveProjects(list, [], "created")), ["Bühne", "Zaun", "Alt", "Kaputt"]);
  });
});

describe("Alphabetisch A–Z (deutsche Sortierung)", () => {
  it("Umlaute werden wie ihr Grundbuchstabe einsortiert, Groß-/Kleinschreibung egal", () => {
    const list = [
      { id: "1", name: "überdachung" },
      { id: "2", name: "Zaun" },
      { id: "3", name: "Ährenweg" },
      { id: "4", name: "balkon" },
    ];
    assert.deepEqual(names(sortActiveProjects(list, [], "name")), ["Ährenweg", "balkon", "überdachung", "Zaun"]);
  });

  it("Zahlen im Namen werden numerisch sortiert", () => {
    const list = [{ id: "1", name: "Halle 10" }, { id: "2", name: "Halle 2" }];
    assert.deepEqual(names(sortActiveProjects(list, [], "name")), ["Halle 2", "Halle 10"]);
  });
});

describe("Stabile Sortierung bei gleichen Werten", () => {
  it("gleicher Name -> Projektnummer, dann ID; unabhängig von der Eingabereihenfolge", () => {
    const list = [
      { id: "z", nr: "200", name: "Treppe" },
      { id: "y", nr: "100", name: "Treppe" },
      { id: "x", nr: "100", name: "Treppe" },
    ];
    const expected = ["x", "y", "z"];
    for (const mode of ["status", "created", "name"]) {
      assert.deepEqual(sortActiveProjects(list, [], mode).map((p) => p.id), expected, mode);
      assert.deepEqual(sortActiveProjects([...list].reverse(), [], mode).map((p) => p.id), expected, mode);
    }
  });

  it("verändert die übergebene Liste nicht", () => {
    const copy = projects.map((p) => p.id);
    sortActiveProjects(projects, items, "name");
    assert.deepEqual(projects.map((p) => p.id), copy);
  });
});

describe("Archiv getrennt von aktiven Projekten", () => {
  const all = [
    { id: "1", name: "Pergola", archived: false },
    { id: "2", name: "Zaun Alt", archived: true },
    { id: "3", name: "Balkon", archived: false },
    { id: "4", name: "Anbau Alt", archived: true },
    { id: "5", name: "Melle", archived: true },
  ];

  it("aktive und archivierte Projekte werden nicht vermischt", () => {
    const { active, archived } = splitProjects(all);
    assert.deepEqual(names(active), ["Pergola", "Balkon"]);
    assert.deepEqual(names(archived), ["Zaun Alt", "Anbau Alt", "Melle"]);
  });

  it("Archiv Standard A–Z, nach Umschalten Z–A, erneutes Umschalten wieder A–Z", () => {
    const { archived } = splitProjects(all);
    let dirState = "asc";
    assert.deepEqual(names(sortArchivedProjects(archived, dirState)), ["Anbau Alt", "Melle", "Zaun Alt"]);
    dirState = toggleSortDir(dirState);
    assert.equal(dirState, "desc");
    assert.deepEqual(names(sortArchivedProjects(archived, dirState)), ["Zaun Alt", "Melle", "Anbau Alt"]);
    dirState = toggleSortDir(dirState);
    assert.equal(dirState, "asc");
    assert.deepEqual(names(sortArchivedProjects(archived, dirState)), ["Anbau Alt", "Melle", "Zaun Alt"]);
  });

  it("alle Projekte archiviert -> Archiv-Einblendung bleibt erreichbar", () => {
    const allArchived = all.map((p) => ({ ...p, archived: true }));
    assert.equal(splitProjects(allArchived).active.length, 0);
    assert.equal(isArchiveToggleVisible(allArchived), true);
  });

  it("ohne jedes Projekt gibt es keine Archiv-Einblendung (bisheriger Leerzustand)", () => {
    assert.equal(isArchiveToggleVisible([]), false);
  });
});

describe("Archivierte Projekte öffnen und zurückholen (Verdrahtung)", () => {
  // Kein DOM-Renderer in der Testumgebung (node:test ohne JSX) - deshalb
  // Prüfung der Verdrahtung im Quelltext: Archivkarten nutzen dieselbe
  // Projektkarte und dieselbe Öffnen-Aktion wie aktive Projekte, und das
  // Zurückholen bleibt unverändert in der Projektdetailansicht.
  const listSource = readFileSync(path.join(dir, "ProjectsList.jsx"), "utf8");
  const detailSource = readFileSync(path.join(dir, "ProjectDetail.jsx"), "utf8");

  it("Archivliste rendert dieselbe ProjectCard mit derselben Öffnen-Aktion", () => {
    const archiveBlock = listSource.slice(listSource.indexOf('className="archiveSection"'));
    assert.match(archiveBlock, /sortedArchived\.map\(\(p\) => \(\s*<ProjectCard [^>]*onOpen=\{openProject\}/);
    assert.match(listSource, /const openProject = \(id\) => \{\s*setProjectId\(id\);\s*setView\("projectDetail"\);/);
  });

  it("'Aus Archiv zurückholen' ist in der Projektdetailansicht weiterhin vorhanden", () => {
    assert.match(detailSource, /setProjectArchived\(project\.id, false\)/);
    assert.match(detailSource, /Aus Archiv zurückholen/);
  });
});
