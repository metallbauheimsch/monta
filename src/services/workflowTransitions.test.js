/**
 * Tests: Workflow-Übergänge (bisherige Regeln unverändert) und einmalige
 * Druckmail "Projekt materialbereit" (Sprint 2C, client-seitiger Teil).
 * Der serverseitige Teil (Einmaligkeit, Bestandsprojekte, Aktivierung,
 * Druckjob-Sperre) wird in supabase_patch_project_ready_print_mail.test.js textlich
 * abgesichert. Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  planWorkflowTransitions,
  readyProjectIds,
  printJobsAfterReadyMail,
  parseProjectReadyPrintResponse,
  readyMailSeenActive,
  rememberReadyMailActive,
} from "./workflowTransitions.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (...parts) => readFileSync(path.join(...parts), "utf8").replace(/\r\n/g, "\n");

describe("planWorkflowTransitions: bisherige Regeln bleiben unverändert", () => {
  it("'Alle Pos. bestellt' nur bei offen -> bestellt", () => {
    const plan = planWorkflowTransitions({ p1: "offen" }, { p1: "bestellt" }, {}, {});
    assert.deepEqual(plan.allItemsOrdered, ["p1"]);
  });

  it("keine 'Alle bestellt'-Mail bei bereit -> bestellt, ohne Vorzustand oder ohne Änderung", () => {
    assert.deepEqual(planWorkflowTransitions({ p1: "bereit" }, { p1: "bestellt" }, {}, {}).allItemsOrdered, []);
    assert.deepEqual(planWorkflowTransitions({}, { p1: "bestellt" }, {}, {}).allItemsOrdered, []);
    assert.deepEqual(planWorkflowTransitions({ p1: "bestellt" }, { p1: "bestellt" }, {}, {}).allItemsOrdered, []);
  });

  it("Druckjob je Baugruppe nur bei Übergang auf bereit mit bekanntem Vorzustand", () => {
    const plan = planWorkflowTransitions({}, {}, { "p1|A": "offen", "p1|B": "bereit" }, { "p1|A": "bereit", "p1|B": "bereit", "p1|C": "bereit" });
    assert.deepEqual(plan.printJobs, [{ projectId: "p1", baugruppe: "A" }]);
  });

  it("Baugruppenschlüssel wird wie bisher per split('|') zerlegt", () => {
    const plan = planWorkflowTransitions({}, {}, { "p1|": "offen" }, { "p1|": "bereit" });
    assert.deepEqual(plan.printJobs, []);
  });
});

describe("Druckmail: Kandidaten beim Statuswechsel auf grün", () => {
  it("offen -> bereit und bestellt -> bereit sind Kandidaten", () => {
    const plan = planWorkflowTransitions({ p1: "offen", p2: "bestellt" }, { p1: "bereit", p2: "bereit" }, {}, {});
    assert.deepEqual(plan.readyProjects, ["p1", "p2"]);
  });

  it("erstes Erscheinen als bereit (nach dem Laden) ist Kandidat - Server entscheidet", () => {
    assert.deepEqual(planWorkflowTransitions({}, { p1: "bereit" }, {}, {}).readyProjects, ["p1"]);
  });

  it("bleibt bereit -> kein erneuter Kandidat (kein Dauerfeuer bei jedem Realtime-Ereignis)", () => {
    assert.deepEqual(planWorkflowTransitions({ p1: "bereit" }, { p1: "bereit" }, {}, {}).readyProjects, []);
  });

  it("nicht bereit (offen/bestellt/leer) -> kein Kandidat", () => {
    const plan = planWorkflowTransitions({}, { a: "offen", b: "bestellt", c: "leer" }, {}, {});
    assert.deepEqual(plan.readyProjects, []);
  });

  it("readyProjectIds liefert beim ersten Abgleich alle bereits grünen Projekte", () => {
    assert.deepEqual(readyProjectIds({ a: "bereit", b: "offen", c: "bereit" }), ["a", "c"]);
    assert.deepEqual(readyProjectIds(null), []);
  });
});

describe("parseProjectReadyPrintResponse: sicher inaktiv, einmalig, ohne Doppelversand", () => {
  it("vor dem SQL-Patch / Fehler / inaktiv -> keine Mail, inaktiv", () => {
    for (const data of [null, undefined, "x", {}, { enabled: false, created: ["e1"] }, { enabled: "true" }]) {
      assert.deepEqual(parseProjectReadyPrintResponse(data), { active: false, eventIds: [] });
    }
  });

  it("aktiv + neu angelegtes Ereignis -> genau diese ID wird versendet", () => {
    assert.deepEqual(parseProjectReadyPrintResponse({ enabled: true, created: ["e1"], retry: [] }), {
      active: true,
      eventIds: ["e1"],
    });
  });

  it("erneutes Grünwerden / Bestandsprojekt: Server legt nichts an -> keine Mail", () => {
    assert.deepEqual(parseProjectReadyPrintResponse({ enabled: true, created: [], retry: [] }), {
      active: true,
      eventIds: [],
    });
  });

  it("gleichzeitige Geräte: nur der Gewinner erhält die neue ID, der zweite sendet nichts", () => {
    const winner = parseProjectReadyPrintResponse({ enabled: true, created: ["e1"], retry: [] });
    const loser = parseProjectReadyPrintResponse({ enabled: true, created: [], retry: [] });
    assert.deepEqual([...winner.eventIds, ...loser.eventIds], ["e1"]);
  });

  it("hängengebliebenes pending-Ereignis wird nachgereicht, doppelte IDs entfernt", () => {
    assert.deepEqual(
      parseProjectReadyPrintResponse({ enabled: true, created: ["e1"], retry: ["e1", "e2", null, 5] }).eventIds,
      ["e1", "e2"]
    );
  });
});

describe("Druckjobs nach Aktivierung der Druckmail", () => {
  const jobs = [{ projectId: "p1", baugruppe: "A" }];

  it("Druckmail aktiv -> keine automatischen Druckjobs", () => {
    assert.deepEqual(printJobsAfterReadyMail(jobs, true), []);
  });

  it("inaktiv oder unbekannt -> bisherige Druckjobs unverändert", () => {
    assert.deepEqual(printJobsAfterReadyMail(jobs, false), jobs);
    assert.deepEqual(printJobsAfterReadyMail(jobs, undefined), jobs);
  });
});

describe("Gerätemerker: Druckmail auf diesem Gerät als aktiv erkannt", () => {
  function memoryStorage() {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
    };
  }

  it("Standard: nicht gesetzt -> kein Aufruf beim App-Start", () => {
    assert.equal(readyMailSeenActive(memoryStorage()), false);
  });

  it("aktiv gemeldet -> gesetzt; danach inaktiv gemeldet -> wieder gelöscht", () => {
    const s = memoryStorage();
    rememberReadyMailActive(true, s);
    assert.equal(readyMailSeenActive(s), true);
    rememberReadyMailActive(false, s);
    assert.equal(readyMailSeenActive(s), false);
  });

  it("nur eindeutig true setzt den Merker", () => {
    const s = memoryStorage();
    for (const v of [undefined, null, "true", 1]) {
      rememberReadyMailActive(v, s);
      assert.equal(readyMailSeenActive(s), false);
    }
  });

  it("kein/defekter Speicher -> sicher 'nicht gesetzt', keine Ausnahme", () => {
    const broken = {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
      removeItem() { throw new Error("blocked"); },
    };
    assert.equal(readyMailSeenActive(null), false);
    assert.equal(readyMailSeenActive(broken), false);
    assert.doesNotThrow(() => rememberReadyMailActive(true, broken));
    assert.doesNotThrow(() => rememberReadyMailActive(true, null));
  });
});

describe("useWorkflowWatchers / workflowNotifications: Verdrahtung", () => {
  const hook = read(dir, "useWorkflowWatchers.js");
  const svc = read(dir, "workflowNotifications.js");

  it("Watcher nutzt die reine Übergangslogik und filtert Druckjobs über den Serverstatus", () => {
    assert.match(hook, /planWorkflowTransitions\(/);
    assert.match(hook, /printJobs = printJobsAfterReadyMail\(printJobs, active\);/);
    assert.match(hook, /await enqueuePrintJob\(\{ projectId, baugruppe, cycle \}\);/);
  });

  it("'Alle bestellt'-Mail unverändert (gleicher Zyklusaufruf und Geltungsbereich)", () => {
    assert.match(hook, /nextEventCycle\("all_items_ordered", projectId, "__project__"\)/);
    assert.match(hook, /baugruppe: "Gesamtprojekt",/);
  });

  it("erster Abgleich blockiert nicht (kein await) - bisheriges busy-Verhalten bleibt", () => {
    assert.match(hook, /if \(readyMailSeenActive\(\)\) requestProjectReadyPrintMails\(readyProjectIds\(byProject\)\);/);
  });

  it("inaktiv: beim App-Start kein Serveraufruf ohne Gerätemerker (nur der eine Aufruf im Seed)", () => {
    const seed = hook.match(/if \(!seeded\.current\) \{[\s\S]*?return;\n        \}/)[0];
    assert.equal((seed.match(/requestProjectReadyPrintMails\(/g) || []).length, 1);
    assert.match(seed, /if \(readyMailSeenActive\(\)\) requestProjectReadyPrintMails/);
  });

  it("Gerätemerker folgt der Serverantwort; fehlende Funktion löscht ihn, Netzfehler nicht", () => {
    const fn = svc.match(/export async function requestProjectReadyPrintMails[\s\S]*?\n\}\n/)[0];
    assert.match(fn, /\} else \{\s*rememberReadyMailActive\(false\);\s*\}/);
    assert.match(fn, /rememberReadyMailActive\(active\);\s*if \(active && eventIds\.length\) await invokeWorkflow\(eventIds\);/);
  });

  it("kein direkter Client-Insert für die Druckmail - nur die Server-RPC", () => {
    const fn = svc.match(/export async function requestProjectReadyPrintMails[\s\S]*?\n\}\n/)[0];
    assert.match(fn, /supabase\.rpc\("request_project_ready_print_mails"/);
    assert.equal(/\.from\("notification_events"\)/.test(fn), false);
    assert.equal(/project_ready_print:/.test(svc), false, "event_key wird nur serverseitig gebildet");
  });

  it("fehlende Funktion (vor dem SQL-Patch) gilt still als inaktiv; Ausnahmen ebenfalls", () => {
    const fn = svc.match(/export async function requestProjectReadyPrintMails[\s\S]*?\n\}\n/)[0];
    assert.match(fn, /error\.code !== "PGRST202"/);
    assert.match(fn, /\} catch \(err\) \{[\s\S]*?return \{ active: false \};/);
  });

  it("bestehende Mail-Empfänger unverändert", () => {
    assert.match(svc, /lager_completed: "stoehr@metallbau-heimsch\.de"/);
    assert.match(svc, /tb_pruefung_completed: "sautter@metallbau-heimsch\.de"/);
    assert.match(svc, /all_items_ordered: "sautter@metallbau-heimsch\.de"/);
    assert.match(svc, /warenkorb_completed: "sautter@metallbau-heimsch\.de"/);
  });
});
