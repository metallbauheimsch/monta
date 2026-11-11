/**
 * Regression: TB-Einträge dürfen nach Anlegen nicht durch veraltetes load()
 * verschwinden und nach Löschen nicht wieder auftauchen.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createPendingItemMutations,
  rememberAddedItems,
  rememberRemovedItemIds,
  applyPendingItemMutations,
  gcPendingItemMutations,
} from "./itemSync.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(dir, "..", "App.jsx"), "utf8").replace(/\r\n/g, "\n");

function item(id, extra = {}) {
  return { id, bezeichnung: extra.bezeichnung || `Pos ${id}`, ...extra };
}

describe("1) Neue TB-Einträge überleben einen veralteten Server-Snapshot", () => {
  it("lokal angelegte Zeile bleibt, wenn SELECT sie noch nicht enthält", () => {
    const pending = createPendingItemMutations();
    const added = item("new-1", { bezeichnung: "Sechskantschraube" });
    rememberAddedItems(pending, [added]);

    const merged = applyPendingItemMutations([item("old-1")], pending);
    assert.equal(merged.some((i) => i.id === "new-1"), true);
    assert.equal(merged.find((i) => i.id === "new-1").bezeichnung, "Sechskantschraube");
    assert.equal(merged.some((i) => i.id === "old-1"), true);
  });

  it("sobald der Server die Zeile kennt, wird der Pending-Eintrag entsorgt", () => {
    const pending = createPendingItemMutations();
    rememberAddedItems(pending, [item("new-1")]);
    const server = [item("old-1"), item("new-1")];
    gcPendingItemMutations(server, pending);
    assert.equal(pending.addedById.has("new-1"), false);
    const merged = applyPendingItemMutations(server, pending);
    assert.equal(merged.filter((i) => i.id === "new-1").length, 1);
  });
});

describe("2) Gelöschte TB-Einträge kommen durch veraltetes load() nicht zurück", () => {
  it("Server-Zeile, die lokal gelöscht wurde, wird aus dem Snapshot gestrichen", () => {
    const pending = createPendingItemMutations();
    rememberRemovedItemIds(pending, ["gone-1"]);
    const merged = applyPendingItemMutations(
      [item("keep-1"), item("gone-1", { bezeichnung: "Schraube" })],
      pending
    );
    assert.equal(merged.some((i) => i.id === "gone-1"), false);
    assert.equal(merged.some((i) => i.id === "keep-1"), true);
  });

  it("Pending-Löschung bleibt, bis der Server die Zeile wirklich nicht mehr liefert", () => {
    const pending = createPendingItemMutations();
    rememberRemovedItemIds(pending, ["gone-1"]);
    gcPendingItemMutations([item("gone-1"), item("keep-1")], pending);
    assert.equal(pending.removedIds.has("gone-1"), true);
    gcPendingItemMutations([item("keep-1")], pending);
    assert.equal(pending.removedIds.has("gone-1"), false);
  });
});

describe("App.jsx verdrahtet den Abgleich für Anlegen und Löschen", () => {
  it("importiert itemSync und wendet ihn beim load() auf material_items an", () => {
    assert.match(appSrc, /from ["']\.\/utils\/itemSync["']/);
    assert.match(appSrc, /applyPendingItemMutations\(/);
    assert.match(appSrc, /rememberAddedItems\(/);
    assert.match(appSrc, /rememberRemovedItemIds\(/);
  });

  it("addItem merkt die neue Zeile, bevor ein paralleles load() den State setzt", () => {
    const addFn = appSrc.slice(appSrc.indexOf("async function addItem"), appSrc.indexOf("async function updateItem"));
    assert.match(addFn, /rememberAddedItems\(/);
    assert.match(addFn, /loadGeneration\.current \+= 1/);
  });

  it("deleteItem merkt die Löschung dauerhaft gegen nachfolgende Snapshots", () => {
    const delFn = appSrc.slice(appSrc.indexOf("async function deleteItem"), appSrc.indexOf("if (authLoading)"));
    assert.match(delFn, /rememberRemovedItemIds\(/);
    assert.match(delFn, /loadGeneration\.current \+= 1/);
  });
});
