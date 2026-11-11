/**
 * Regression: Bauteil duplizieren übernimmt fachlichen Inhalt, neue IDs
 * und Ersatz-Beziehungen – Original bleibt unverändert.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { formatEinbauort } from "../../utils/structure.js";
import { buildDuplicatedBauteilItems, splitDuplicatedItemsForInsert } from "./duplicateBauteilItems.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(dir, "..", "..", "App.jsx"), "utf8").replace(/\r\n/g, "\n");

function sourceItems() {
  return [
    {
      id: "old-main",
      project_id: "p1",
      pos: "1",
      einbauort: formatEinbauort("Stützen", "S1"),
      menge: 8,
      bezeichnung: "Sechskantschraube",
      groesse: "M12",
      laenge: "40",
      oberflaeche: "feuerverzinkt",
      hinweis: "80 Nm",
      important_note: true,
      bereit: 8,
      bestellt: true,
      geliefert: true,
      ersetzt_durch: "old-repl",
    },
    {
      id: "old-repl",
      project_id: "p1",
      pos: "2",
      einbauort: formatEinbauort("Stützen", "S1"),
      menge: 8,
      bezeichnung: "Sechskantschraube",
      groesse: "M12",
      laenge: "50",
      oberflaeche: "feuerverzinkt",
      hinweis: "",
      important_note: false,
      bereit: 0,
      bestellt: false,
      geliefert: false,
      ersetzt_durch: null,
    },
  ];
}

describe("3) Dupliziertes Bauteil übernimmt Inhalte mit neuen IDs", () => {
  it("kopiert fachliche Felder, setzt Lager/Bestell zurück und vergibt neue UUIDs", () => {
    const src = sourceItems();
    const snapshot = structuredClone(src);
    let n = 0;
    const copies = buildDuplicatedBauteilItems(src, {
      projectId: "p1",
      baugruppe: "Stützen",
      newBauteilName: "S1 Kopie",
      createId: () => `new-${++n}`,
    });

    assert.equal(copies.length, 2);
    assert.deepEqual(src, snapshot, "Originalobjekte dürfen nicht mutiert werden");
    assert.equal(copies[0].id, "new-1");
    assert.equal(copies[1].id, "new-2");
    assert.notEqual(copies[0].id, src[0].id);
    assert.equal(copies[0].bezeichnung, "Sechskantschraube");
    assert.equal(copies[0].groesse, "M12");
    assert.equal(copies[0].laenge, "40");
    assert.equal(copies[0].oberflaeche, "feuerverzinkt");
    assert.equal(copies[0].hinweis, "80 Nm");
    assert.equal(copies[0].important_note, true);
    assert.equal(copies[0].menge, 8);
    assert.equal(copies[0].pos, "1");
    assert.equal(copies[0].einbauort, formatEinbauort("Stützen", "S1 Kopie"));
    assert.equal(copies[0].bereit, 0);
    assert.equal(copies[0].bestellt, false);
    assert.equal(copies[0].geliefert, false);
    assert.equal(copies[0].project_id, "p1");
    assert.equal(src[0].einbauort, formatEinbauort("Stützen", "S1"));
    assert.equal(src[0].bereit, 8);
  });

  it("biegt ersetzt_durch auf die neue Ersatzposition um, nicht auf das Original", () => {
    const copies = buildDuplicatedBauteilItems(sourceItems(), {
      projectId: "p1",
      baugruppe: "Stützen",
      newBauteilName: "S2",
      createId: () => crypto.randomUUID(),
    });
    const byPos = Object.fromEntries(copies.map((i) => [i.pos, i]));
    assert.equal(byPos["1"].ersetzt_durch, byPos["2"].id);
    assert.notEqual(byPos["1"].ersetzt_durch, "old-repl");
    assert.equal(byPos["2"].ersetzt_durch, null);
  });

  it("Insert läuft zuerst ohne FK, Ersatzverweise danach per Update", () => {
    const copies = buildDuplicatedBauteilItems(sourceItems(), {
      projectId: "p1",
      baugruppe: "Stützen",
      newBauteilName: "S2",
      createId: () => crypto.randomUUID(),
    });
    const { insertRows, fkUpdates } = splitDuplicatedItemsForInsert(copies);
    assert.equal(insertRows.length, 2);
    assert.equal("ersetzt_durch" in insertRows[0], false);
    assert.equal(fkUpdates.length, 1);
    assert.equal(fkUpdates[0].id, copies[0].id);
    assert.equal(fkUpdates[0].ersetzt_durch, copies[1].id);
  });
});

describe("App.jsx nutzt die Duplizier-Aufbereitung", () => {
  it("duplicateBauteil baut Kopien über buildDuplicatedBauteilItems", () => {
    const fn = appSrc.slice(
      appSrc.indexOf("async function duplicateBauteil"),
      appSrc.indexOf("async function setProjectCompletion")
    );
    assert.match(fn, /buildDuplicatedBauteilItems\(/);
    assert.match(fn, /splitDuplicatedItemsForInsert\(/);
    assert.match(fn, /rememberAddedItems\(/);
    assert.equal(/srcItems\.map\(\(i\) => \(\{/.test(fn), false);
  });
});
