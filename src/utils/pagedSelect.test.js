/**
 * Regression: load() darf bei mehr als 1000 Zeilen nicht die neuesten
 * Materialpositionen verlieren. Die Data-API liefert je Anfrage höchstens
 * 1000 Zeilen; ohne weitere Seiten bleiben bei aufsteigendem created_at
 * genau die neuesten Einträge unsichtbar.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fetchAllPages, SUPABASE_PAGE_SIZE } from "./pagedSelect.js";
import { parseEinbauort } from "./structure.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(dir, "..", "App.jsx"), "utf8").replace(/\r\n/g, "\n");

function rowsAscending(count, labelAtEnd) {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${String(index).padStart(4, "0")}`,
    created_at: new Date(Date.UTC(2024, 0, 1) + index * 1000).toISOString(),
    bezeichnung: index === count - 1 ? labelAtEnd : `alt-${index}`,
  }));
}

function pageFrom(allRows) {
  return (from, to) => {
    const data = allRows.slice(from, to + 1);
    return Promise.resolve({ data, error: null });
  };
}

describe("Materialpositionen über der 1000-Zeilen-Grenze", () => {
  it("eine einzelne Seite lässt die neueste Position hinter 1000 älteren Zeilen weg", () => {
    const all = rowsAscending(SUPABASE_PAGE_SIZE + 11, "neue TB-Position");
    const firstPage = all.slice(0, SUPABASE_PAGE_SIZE);
    assert.equal(firstPage.length, 1000);
    assert.equal(firstPage.some((row) => row.bezeichnung === "neue TB-Position"), false);
    assert.equal(all.at(-1).bezeichnung, "neue TB-Position");
    assert.ok(all.at(-1).created_at > firstPage.at(-1).created_at);
  });

  it("lädt alle Seiten und behält die neueste Position am Ende", async () => {
    const all = rowsAscending(SUPABASE_PAGE_SIZE + 11, "neue TB-Position");
    const { data, error } = await fetchAllPages(pageFrom(all), SUPABASE_PAGE_SIZE);
    assert.equal(error, null);
    assert.equal(data.length, 1011);
    assert.deepEqual(
      data.map((row) => row.id),
      all.map((row) => row.id)
    );
    assert.equal(data.at(-1).bezeichnung, "neue TB-Position");
    assert.equal(data.at(-1).id, "item-1010");
  });

  it("fragt nach einer vollen Seite eine weitere Seite ab", async () => {
    const all = rowsAscending(SUPABASE_PAGE_SIZE, "letzte der ersten Seite");
    const calls = [];
    const { data, error } = await fetchAllPages((from, to) => {
      calls.push([from, to]);
      return pageFrom(all)(from, to);
    }, SUPABASE_PAGE_SIZE);
    assert.equal(error, null);
    assert.equal(data.length, 1000);
    assert.deepEqual(calls, [
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("gibt bei einem Fehler der Folgeseite keine Teilmenge als Erfolg zurück", async () => {
    const { data, error } = await fetchAllPages(async (from) => {
      if (from === 0) {
        return { data: rowsAscending(SUPABASE_PAGE_SIZE, "x"), error: null };
      }
      return { data: null, error: { message: "Seite 2 fehlgeschlagen" } };
    }, SUPABASE_PAGE_SIZE);
    assert.equal(data, null);
    assert.equal(error.message, "Seite 2 fehlgeschlagen");
  });
});

describe("Projekte über der 1000-Zeilen-Grenze", () => {
  it("behält created_at absteigend und liefert auch die älteste Zeile der letzten Seite", async () => {
    const count = SUPABASE_PAGE_SIZE + 1;
    const newestFirst = Array.from({ length: count }, (_, index) => ({
      id: `project-${index}`,
      created_at: new Date(Date.UTC(2026, 0, 1) - index * 1000).toISOString(),
    }));
    const { data, error } = await fetchAllPages(pageFrom(newestFirst), SUPABASE_PAGE_SIZE);
    assert.equal(error, null);
    assert.equal(data.length, count);
    assert.equal(data[0].id, "project-0");
    assert.ok(data[0].created_at > data[1].created_at);
    assert.equal(data.at(-1).id, "project-1000");
    assert.ok(data.at(-1).created_at < data.at(-2).created_at);
  });
});

describe("Praxisfall: neueste Position liegt hinter der ersten Seite", () => {
  const projectId = "projekt-kita";
  const screw = {
    id: "neue-schraube",
    project_id: projectId,
    created_at: "2026-11-11T13:25:27.676Z",
    einbauort: "Hochbeet / test",
    bezeichnung: "Sechskantschraube",
  };

  function storedRows() {
    const older = Array.from({ length: SUPABASE_PAGE_SIZE }, (_, index) => ({
      id: `alt-${index}`,
      project_id: projectId,
      created_at: new Date(Date.UTC(2024, 0, 1) + index * 1000).toISOString(),
      einbauort: "Hochbeet / Rahmen",
      bezeichnung: "alt",
    }));
    const between = Array.from({ length: 11 }, (_, index) => ({
      id: `danach-${index}`,
      project_id: projectId,
      created_at: new Date(Date.UTC(2026, 10, 11, 10, 32, index)).toISOString(),
      einbauort: "Hochbeet / Rahmen",
      bezeichnung: "danach",
    }));
    return [...older, ...between, screw];
  }

  function visibleInBauteil(rows) {
    return rows.filter((item) => {
      if (item.project_id !== projectId) return false;
      const parsed = parseEinbauort(item.einbauort, "");
      return parsed.baugruppe === "Hochbeet" && parsed.bauteil === "test";
    });
  }

  it("die erste Seite enthält die neue Schraube nicht, die zusammengefügten Seiten schon", async () => {
    const all = storedRows();
    assert.equal(all.length, 1012);
    const firstPage = all.slice(0, SUPABASE_PAGE_SIZE);
    assert.equal(firstPage.some((row) => row.id === screw.id), false);
    assert.equal(visibleInBauteil(firstPage).length, 0);

    const { data, error } = await fetchAllPages(pageFrom(all), SUPABASE_PAGE_SIZE);
    assert.equal(error, null);
    assert.equal(data.length, 1012);
    assert.equal(data[1011].id, screw.id);
    assert.equal(data[1011].bezeichnung, "Sechskantschraube");
    const visible = visibleInBauteil(data);
    assert.equal(visible.length, 1);
    assert.equal(visible[0].einbauort, "Hochbeet / test");
    const parsed = parseEinbauort(visible[0].einbauort, "Allgemein");
    assert.deepEqual(parsed, { baugruppe: "Hochbeet", bauteil: "test" });
  });
});

function compareCreatedAtThenId(a, b, createdAtAscending) {
  if (a.created_at !== b.created_at) {
    const byTime = a.created_at < b.created_at ? -1 : 1;
    return createdAtAscending ? byTime : -byTime;
  }
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

function pageInStableOrder(rows, createdAtAscending) {
  const sorted = [...rows].sort((a, b) => compareCreatedAtThenId(a, b, createdAtAscending));
  return (from, to) => Promise.resolve({ data: sorted.slice(from, to + 1), error: null });
}

describe("Seitengrenzen 1000, 1001, 2000 und 2001", () => {
  for (const count of [1000, 1001, 2000, 2001]) {
    it(`liefert alle ${count} Zeilen genau einmal`, async () => {
      const all = rowsAscending(count, "letzte");
      const calls = [];
      const { data, error } = await fetchAllPages((from, to) => {
        calls.push([from, to]);
        return pageFrom(all)(from, to);
      }, SUPABASE_PAGE_SIZE);
      assert.equal(error, null);
      assert.equal(data.length, count);
      assert.deepEqual(
        data.map((row) => row.id),
        all.map((row) => row.id)
      );
      assert.equal(calls[0][0], 0);
      assert.equal(calls.at(-1)[0], Math.floor(count / SUPABASE_PAGE_SIZE) * SUPABASE_PAGE_SIZE);
      assert.ok(calls.every(([, to], index) => to - calls[index][0] + 1 === SUPABASE_PAGE_SIZE));
    });
  }
});

describe("gleiche created_at an der Seitengrenze", () => {
  const shared = "2026-11-11T12:00:00.000Z";

  function rowsAroundBoundary(createdAtAscending) {
    const rows = [];
    for (let index = 0; index < SUPABASE_PAGE_SIZE - 1; index += 1) {
      rows.push({
        id: `early-${String(index).padStart(4, "0")}`,
        created_at: new Date(Date.UTC(2024, 0, 1) + index * 1000).toISOString(),
      });
    }
    rows.push(
      { id: "tie-b", created_at: shared },
      { id: "tie-a", created_at: shared },
      { id: "after-z", created_at: "2026-11-11T13:00:00.000Z" }
    );
    return pageInStableOrder(rows, createdAtAscending);
  }

  it("behält bei aufsteigendem created_at beide Zeilen und sortiert nur den Gleichstand nach id", async () => {
    const { data, error } = await fetchAllPages(rowsAroundBoundary(true), SUPABASE_PAGE_SIZE);
    assert.equal(error, null);
    assert.equal(data.length, SUPABASE_PAGE_SIZE + 2);
    const tie = data.filter((row) => row.created_at === shared).map((row) => row.id);
    assert.deepEqual(tie, ["tie-a", "tie-b"]);
    assert.equal(data.at(-1).id, "after-z");
    assert.ok(data.at(-1).created_at > data.at(-2).created_at);
    assert.equal(new Set(data.map((row) => row.id)).size, data.length);
  });

  it("behält bei absteigendem created_at die Zeitfolge und unterscheidet den Gleichstand nach id", async () => {
    const { data, error } = await fetchAllPages(rowsAroundBoundary(false), SUPABASE_PAGE_SIZE);
    assert.equal(error, null);
    assert.equal(data[0].id, "after-z");
    const tie = data.filter((row) => row.created_at === shared).map((row) => row.id);
    assert.deepEqual(tie, ["tie-a", "tie-b"]);
    assert.ok(data[0].created_at > data[1].created_at);
    assert.equal(new Set(data.map((row) => row.id)).size, data.length);
  });
});

describe("App.jsx lädt Projekte, Material und Struktur seitenweise", () => {
  it("verwendet fetchAllPages, created_at und id für alle drei Tabellen", () => {
    const loadStart = appSrc.indexOf("const load = useCallback");
    const loadFn = appSrc.slice(loadStart, appSrc.indexOf("useEffect(() => {", loadStart));
    assert.equal(loadFn.match(/fetchAllPages\(\(from, to\) =>/g).length, 3);
    assert.match(
      loadFn,
      /\.from\("projects"\)\s*\.select\("\*"\)\s*\.order\("created_at", \{ ascending: false \}\)\s*\.order\("id", \{ ascending: true \}\)\s*\.range\(from, to\)/
    );
    assert.match(
      loadFn,
      /\.from\("material_items"\)\s*\.select\("\*"\)\s*\.order\("created_at", \{ ascending: true \}\)\s*\.order\("id", \{ ascending: true \}\)\s*\.range\(from, to\)/
    );
    assert.match(
      loadFn,
      /\.from\("project_structure"\)\s*\.select\("\*"\)\s*\.order\("created_at", \{ ascending: true \}\)\s*\.order\("id", \{ ascending: true \}\)\s*\.range\(from, to\)/
    );
    assert.match(loadFn, /if \(structureRes\.error\)/);
  });
});
