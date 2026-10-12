/**
 * Tests: Lagerabschluss ohne unnötige Mail (Sprint 2B).
 * Reine Entscheidungslogik + Quelltext-Prüfung von setProjectCompletion
 * (kein React-Test-Renderer/kein Supabase im Test, wie im übrigen Projekt).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { shouldSendLagerCompletedMail, decideLagerCompletedMail } from "./lagerCompletionMail.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(dir, "..", "..", "..");
const read = (...parts) => readFileSync(path.join(...parts), "utf8").replace(/\r\n/g, "\n");

const pos = (extra = {}) => ({ id: Math.random().toString(36), menge: 10, bereit: 0, bestellt: false, ...extra });

describe("shouldSendLagerCompletedMail: Materialstand beim Lagerabschluss", () => {
  it("offen (Material fehlt, nicht bestellt) -> Mail wie bisher", () => {
    assert.equal(shouldSendLagerCompletedMail([pos({ bereit: 10 }), pos({ bereit: 3 })]), true);
  });

  it("bestellt (Material fehlt, aber bereits bestellt) -> Mail wie bisher", () => {
    assert.equal(shouldSendLagerCompletedMail([pos({ bereit: 10 }), pos({ bereit: 0, bestellt: true })]), true);
  });

  it("alle aktiven Positionen vollständig bereit -> keine Mail", () => {
    assert.equal(shouldSendLagerCompletedMail([pos({ bereit: 10 }), pos({ menge: 4, bereit: 6 })]), false);
  });

  it("leer (keine Materialpositionen) -> Mail wie bisher", () => {
    assert.equal(shouldSendLagerCompletedMail([]), true);
    assert.equal(shouldSendLagerCompletedMail(null), true);
  });

  it("nur ersetzte Positionen (keine aktive) -> wie leer, Mail wie bisher", () => {
    assert.equal(shouldSendLagerCompletedMail([pos({ ersetzt_durch: "x", bereit: 10 })]), true);
  });

  it("ersetzte Altposition mit Restmenge verfälscht 'bereit' nicht -> keine Mail", () => {
    const items = [pos({ ersetzt_durch: "neu", bereit: 0 }), pos({ id: "neu", bereit: 10 })];
    assert.equal(shouldSendLagerCompletedMail(items), false);
  });

  it("ersetzte bereite Altposition macht eine offene aktive Position nicht bereit -> Mail", () => {
    const items = [pos({ ersetzt_durch: "neu", bereit: 10 }), pos({ id: "neu", bereit: 0 })];
    assert.equal(shouldSendLagerCompletedMail(items), true);
  });

  it("Eingabedaten werden nicht verändert", () => {
    const items = [pos({ bereit: 10 })];
    const before = JSON.stringify(items);
    shouldSendLagerCompletedMail(items);
    assert.equal(JSON.stringify(items), before);
  });
});

describe("decideLagerCompletedMail: frisches Lesen mit sicherem Rückfall", () => {
  it("frische Daten 'alles bereit' -> keine Mail", async () => {
    assert.equal(await decideLagerCompletedMail(async () => [pos({ bereit: 10 })]), false);
  });

  it("frische Daten 'offen' -> Mail", async () => {
    assert.equal(await decideLagerCompletedMail(async () => [pos({ bereit: 1 })]), true);
  });

  it("frische Daten entscheiden, nicht ein veralteter lokaler Stand", async () => {
    let called = 0;
    const result = await decideLagerCompletedMail(async () => {
      called += 1;
      return [pos({ bereit: 2 })];
    });
    assert.equal(called, 1);
    assert.equal(result, true);
  });

  it("Lesefehler (Ausnahme) -> Mail wie bisher", async () => {
    assert.equal(
      await decideLagerCompletedMail(async () => {
        throw new Error("Netzwerkfehler");
      }),
      true
    );
  });

  it("synchroner Fehler im Loader -> Mail wie bisher", async () => {
    assert.equal(
      await decideLagerCompletedMail(() => {
        throw new Error("kaputt");
      }),
      true
    );
  });

  it("ungültige Antwort (kein Array) -> Mail wie bisher", async () => {
    assert.equal(await decideLagerCompletedMail(async () => null), true);
    assert.equal(await decideLagerCompletedMail(async () => ({ data: [] })), true);
  });
});

describe("setProjectCompletion: nur der Lager-Mailzweig ist bedingt, alles andere unverändert", () => {
  const app = read(rootDir, "src", "App.jsx");
  const fnBody = app.match(/async function setProjectCompletion\(pid, field, value\) \{[\s\S]*?\n  \}\n/)[0];

  it("Speichern der Checkbox erfolgt unverändert VOR jeder Mailentscheidung", () => {
    const saveIdx = fnBody.indexOf('.update({ [field]: nextVal })');
    const decideIdx = fnBody.indexOf("decideLagerCompletedMail");
    assert.ok(saveIdx > 0 && decideIdx > saveIdx);
  });

  it("Lager-Zweig: Zyklus + Mail nur, wenn decideLagerCompletedMail true liefert (frisch aus Supabase)", () => {
    assert.match(
      fnBody,
      /field === "lager_abgeschlossen"\) \{[\s\S]*?const sendLagerMail = await decideLagerCompletedMail\(\(\) =>\s*loadProjectMaterialForMailCheck\(pid\)\s*\);\s*if \(sendLagerMail\) \{\s*const cycle = await nextEventCycle\("lager_completed", pid, scope\);\s*await notifyLagerCompleted\(\{ project: proj, baugruppe: scope, cycle \}\);\s*\}/
    );
  });

  it("TB/Prüfung- und Warenkorb-Zweig senden unverändert ohne Materialprüfung", () => {
    assert.match(
      fnBody,
      /field === "tb_pruefung_abgeschlossen"\) \{\s*const cycle = await nextEventCycle\("tb_pruefung_completed", pid, scope\);\s*await notifyTbPruefungCompleted/
    );
    assert.match(
      fnBody,
      /field === "warenkorb_abgeschlossen"\) \{\s*const cycle = await nextEventCycle\("warenkorb_completed", pid, scope\);\s*await notifyWarenkorbCompleted/
    );
    assert.equal((fnBody.match(/decideLagerCompletedMail/g) || []).length, 1);
  });

  it("Mailentscheidung bleibt an den Übergang false -> true gebunden", () => {
    assert.match(fnBody, /if \(nextVal && !prevVal && supabase\) \{/);
  });

  it("keine automatische Checkbox: Hilfsfunktion schreibt nichts und kennt keine Abschlussfelder", () => {
    const helper = read(dir, "lagerCompletionMail.js");
    assert.equal(/supabase|update|insert|lager_abgeschlossen|warenkorb_abgeschlossen/.test(helper), false);
  });

  it("frischer Abruf ist rein lesend, projektbezogen und erkennt unvollständige Antworten", () => {
    const svc = read(rootDir, "src", "services", "workflowNotifications.js");
    const fn = svc.match(/export async function loadProjectMaterialForMailCheck[\s\S]*?\n\}\n/)[0];
    assert.match(fn, /\.from\("material_items"\)\s*\.select\("\*", \{ count: "exact" \}\)\s*\.eq\("project_id", projectId\)/);
    assert.equal(/\.(update|insert|upsert|delete)\(/.test(fn), false);
    assert.match(fn, /count !== data\.length/);
    assert.match(fn, /if \(error\) throw error;/);
  });

  it("keine zusätzliche Hinweismeldung in der Oberfläche", () => {
    assert.equal(/alert\([^)]*(Mail|Lager)/.test(fnBody.slice(fnBody.indexOf("decideLagerCompletedMail"))), false);
  });
});
