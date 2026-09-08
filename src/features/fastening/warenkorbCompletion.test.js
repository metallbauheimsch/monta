/**
 * Tests: "Warenkorb abgeschlossen" (Praxis-Sprint) - fachlich eigenständiger,
 * zusätzlicher manueller Projektabschluss neben "Alle Pos. bestellt".
 * Quelltext-Prüfung statt Rendering, da kein React-Test-Renderer im Projekt
 * vorhanden ist (wie bei den übrigen Tests dieses Projekts, siehe
 * ProjectCompletionSection.test.js).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(dir, "..", "..", "..");

function read(...parts) {
  return readFileSync(path.join(...parts), "utf8").replace(/\r\n/g, "\n");
}

describe("AE/AF) 'Warenkorb abgeschlossen' ist in EinkaufView vorhanden und projektbezogen", () => {
  const source = read(dir, "EinkaufView.jsx");

  it("EinkaufView rendert ProjectCompletionSection mit field warenkorb_abgeschlossen", () => {
    assert.match(source, /field="warenkorb_abgeschlossen"/);
    assert.match(source, /label="Warenkorb abgeschlossen"/);
  });

  it("verwendet dieselbe bestehende ProjectCompletionSection-Komponente (kein neuer Checkbox-Typ)", () => {
    assert.match(source, /from "\.\.\/\.\.\/components\/ProjectCompletionSection"/);
  });

  it("Status kommt aus project[field] (ProjectCompletionSection liest projektbezogen, nicht positions-/baugruppenbezogen)", () => {
    const ccs = read(rootDir, "src", "components", "ProjectCompletionSection.jsx");
    assert.match(ccs, /checked=\{Boolean\(project\[field\]\)\}/);
  });
});

describe("AN) 'Alle Pos. bestellt' bleibt vollständig unverändert", () => {
  const source = read(dir, "EinkaufView.jsx");

  it("bestehende Checkbox/Logik (allBestelltLine, handleAllBestelltChange, confirmAllBestellt) ist weiterhin vorhanden", () => {
    assert.match(source, /Alle Positionen bestellt/);
    assert.match(source, /allBestelltLine/);
    assert.match(source, /handleAllBestelltChange/);
    assert.match(source, /confirmAllBestellt/);
  });

  it("'Alle Pos. bestellt' schreibt weiterhin direkt auf Positionen über updateItem, nicht über setProjectCompletion", () => {
    const fnMatch = source.match(/function applyAllBestellt\([\s\S]*?\n  \}/);
    assert.ok(fnMatch, "applyAllBestellt nicht gefunden");
    assert.match(fnMatch[0], /updateItem\(i\.id, \{ bestellt: checked \}\)/);
  });
});

describe("AG) Beide Zugangswege zum Warenkorb (ProjectView/ProjectWideView) zeigen denselben Status", () => {
  it("TabContent.jsx reicht project und setProjectCompletion unverändert an EinkaufView weiter", () => {
    const source = read(rootDir, "src", "features", "projects", "TabContent.jsx");
    assert.match(
      source,
      /<EinkaufView[\s\S]*?project=\{project\}[\s\S]*?setProjectCompletion=\{setProjectCompletion\}/
    );
  });
});

describe("AH/AI/AJ) false -> true löst die Workflow-Mail an sautter aus, mit Deep-Link", () => {
  it("App.jsx: setProjectCompletion ruft notifyWarenkorbCompleted innerhalb des false->true-Zweigs auf", () => {
    const source = read(rootDir, "src", "App.jsx");
    const fnMatch = source.match(
      /async function setProjectCompletion\(pid, field, value\) \{[\s\S]*?\n  \}\n/
    );
    assert.ok(fnMatch, "setProjectCompletion nicht gefunden");
    const fnBody = fnMatch[0];
    assert.match(fnBody, /if \(nextVal && !prevVal && supabase\) \{/);
    assert.match(fnBody, /field === "warenkorb_abgeschlossen"/);
    assert.match(fnBody, /notifyWarenkorbCompleted/);
    assert.match(fnBody, /"warenkorb_abgeschlossen"/);
  });

  it("allowed-Feldliste enthält warenkorb_abgeschlossen zusätzlich zu den bestehenden Feldern", () => {
    const source = read(rootDir, "src", "App.jsx");
    const allowedMatch = source.match(/const allowed = \[[\s\S]*?\];/);
    assert.ok(allowedMatch);
    assert.match(allowedMatch[0], /"tb_pruefung_abgeschlossen"/);
    assert.match(allowedMatch[0], /"lager_abgeschlossen"/);
    assert.match(allowedMatch[0], /"warenkorb_abgeschlossen"/);
  });

  it("Empfänger ist sautter@metallbau-heimsch.de (workflowNotifications.js)", () => {
    const source = read(rootDir, "src", "services", "workflowNotifications.js");
    assert.match(source, /warenkorb_completed: "sautter@metallbau-heimsch\.de"/);
  });

  it("bestehende Mail-/Dedup-Infrastruktur wiederverwendet: nextEventCycle + enqueueAndSend, kein zweiter Mailmechanismus", () => {
    const source = read(rootDir, "src", "services", "workflowNotifications.js");
    const fnMatch = source.match(/export async function notifyWarenkorbCompleted\([\s\S]*?\n\}/);
    assert.ok(fnMatch, "notifyWarenkorbCompleted nicht gefunden");
    assert.match(fnMatch[0], /enqueueAndSend/);
    assert.equal(/fetch\(/.test(fnMatch[0]), false);
  });

  it("Edge Function: warenkorb_completed nutzt denselben Deep-Link-Mechanismus (deepLinkLine) wie die übrigen Events", () => {
    const source = read(rootDir, "supabase", "functions", "workflow-notifications", "index.ts");
    assert.match(source, /warenkorb_completed: "bestellliste"/);
    assert.match(source, /eventType === "warenkorb_completed"/);
  });
});

describe("AK) true -> false löst keine Mail aus", () => {
  it("Mailversand bleibt für ALLE Felder (inkl. warenkorb_abgeschlossen) an nextVal && !prevVal gebunden - kein Sonderpfad", () => {
    const source = read(rootDir, "src", "App.jsx");
    const fnMatch = source.match(
      /async function setProjectCompletion\(pid, field, value\) \{[\s\S]*?\n  \}\n/
    );
    const fnBody = fnMatch[0];
    // Nur EIN "if (nextVal && !prevVal" Wächter für die gesamte Mailauslösung -
    // kein zusätzlicher/abweichender Bedingungszweig für warenkorb_abgeschlossen.
    const guardCount = (fnBody.match(/if \(nextVal && !prevVal/g) || []).length;
    assert.equal(guardCount, 1);
  });
});

describe("AL/AM) Materialpositionen bleiben durch die Checkbox unverändert", () => {
  it("setProjectCompletion() enthält keinen Aufruf von updateItem/material_items - schreibt ausschließlich auf 'projects'", () => {
    const source = read(rootDir, "src", "App.jsx");
    const fnMatch = source.match(
      /async function setProjectCompletion\(pid, field, value\) \{[\s\S]*?\n  \}\n/
    );
    const fnBody = fnMatch[0];
    assert.match(fnBody, /\.from\("projects"\)/);
    assert.equal(/\.from\("material_items"\)/.test(fnBody), false);
    assert.equal(/updateItem\(/.test(fnBody), false);
  });
});

describe("AO) bestehende Mailarchitektur wiederverwendet, kein paralleler Mailmechanismus", () => {
  it("App.jsx: genau ein Aufrufer von notifyWarenkorbCompleted", () => {
    const source = read(rootDir, "src", "App.jsx");
    const calls = source.match(/notifyWarenkorbCompleted\(/g) || [];
    assert.equal(calls.length, 1);
  });

  it("bestehende all_items_ordered-Mailtexte in der Edge Function bleiben unverändert", () => {
    const source = read(rootDir, "supabase", "functions", "workflow-notifications", "index.ts");
    assert.match(source, /ich war mal wieder shoppen! Die Bestellung für das Projekt/);
    assert.match(source, /Viel Spaß beim Einräumen\./);
  });
});

describe("AP) kein SQL-Fallback auf ein fachlich falsches Feld", () => {
  it("SQL-Patch für warenkorb_abgeschlossen ist vorbereitet (nicht ausgeführt) und nutzt ein eigenes neues Feld", () => {
    const source = read(rootDir, "supabase_patch_warenkorb_completion.sql");
    assert.match(source, /add column if not exists warenkorb_abgeschlossen boolean not null default false/);
  });

  it("App.jsx verwendet kein bestehendes, fachlich anderes Feld als Ersatz (z. B. lager_abgeschlossen) für den Warenkorb-Abschluss", () => {
    const source = read(rootDir, "src", "App.jsx");
    const fnMatch = source.match(
      /async function setProjectCompletion\(pid, field, value\) \{[\s\S]*?\n  \}\n/
    );
    const fnBody = fnMatch[0];
    const warenkorbBranch = fnBody.match(
      /else if \(field === "warenkorb_abgeschlossen"\) \{[\s\S]*?\n        \}/
    );
    assert.ok(warenkorbBranch, "warenkorb_abgeschlossen-Zweig nicht gefunden");
    assert.match(warenkorbBranch[0], /"warenkorb_completed"/);
  });
});
