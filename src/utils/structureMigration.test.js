/**
 * Regression: eine alte Projekt-ID aus der lokalen Registry darf den
 * Insert nach project_structure nicht mehr mit HTTP 409 abbrechen.
 * Gültige Einträge bleiben, der Registry-Inhalt wird nicht gelöscht.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { collectStructureCandidates } from "./structure.js";

const REGISTRY_KEY = "monta_structure_v04";
const GHOST_PROJECT_ID = "cf71cf53-6f91-40de-9681-d12fa9e8d652";
const KNOWN_PROJECT_ID = "d7c737ec-635d-4d35-96d8-6ca1ce532ad7";

const store = new Map();
const localStorageMock = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

function rememberRegistry(registry) {
  store.set(REGISTRY_KEY, JSON.stringify(registry));
}

describe("Struktur-Migration ignoriert unbekannte Projekt-IDs", () => {
  beforeEach(() => {
    store.clear();
    globalThis.localStorage = localStorageMock;
  });

  afterEach(() => {
    delete globalThis.localStorage;
  });

  it("lässt die alte Registry-ID weg und behält die gültige Baugruppe", () => {
    rememberRegistry({
      [GHOST_PROJECT_ID]: {
        baugruppen: ["Alt"],
        bauteile: { Alt: ["Teil"] },
      },
      [KNOWN_PROJECT_ID]: {
        baugruppen: ["Hochbeet"],
        bauteile: { Hochbeet: ["test"] },
      },
    });

    const candidates = collectStructureCandidates(
      [{ id: KNOWN_PROJECT_ID, baugruppe: "" }],
      []
    );
    const projectIds = candidates.map((row) => row.project_id);

    assert.equal(projectIds.includes(GHOST_PROJECT_ID), false);
    assert.equal(projectIds.includes(KNOWN_PROJECT_ID), true);
    assert.equal(
      candidates.some(
        (row) => row.project_id === KNOWN_PROJECT_ID && row.baugruppe === "Hochbeet" && row.bauteil == null
      ),
      true
    );
    assert.equal(
      candidates.some(
        (row) => row.project_id === KNOWN_PROJECT_ID && row.baugruppe === "Hochbeet" && row.bauteil === "test"
      ),
      true
    );
    assert.equal(JSON.parse(store.get(REGISTRY_KEY))[GHOST_PROJECT_ID].baugruppen[0], "Alt");
  });

  it("übernimmt Material nur für vorhandene Projekte und wiederholt die ungültige ID nicht", () => {
    rememberRegistry({
      [GHOST_PROJECT_ID]: { baugruppen: ["Alt"], bauteile: {} },
    });
    const projects = [{ id: KNOWN_PROJECT_ID, baugruppe: "Hochbeet" }];
    const items = [
      { project_id: KNOWN_PROJECT_ID, einbauort: "Hochbeet / Rahmen" },
      { project_id: GHOST_PROJECT_ID, einbauort: "Alt / Teil" },
    ];

    const first = collectStructureCandidates(projects, items);
    const second = collectStructureCandidates(projects, items);

    assert.deepEqual(
      first.map((row) => row.project_id),
      second.map((row) => row.project_id)
    );
    assert.equal(first.some((row) => row.project_id === GHOST_PROJECT_ID), false);
    assert.equal(second.some((row) => row.project_id === GHOST_PROJECT_ID), false);
    assert.equal(
      first.some((row) => row.baugruppe === "Hochbeet" && row.bauteil === "Rahmen"),
      true
    );
    assert.equal(first.some((row) => row.baugruppe === "Alt"), false);
    assert.equal(JSON.parse(store.get(REGISTRY_KEY))[GHOST_PROJECT_ID].baugruppen[0], "Alt");
  });
});
