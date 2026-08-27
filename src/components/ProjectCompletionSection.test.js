/**
 * Tests: Prüfung/Lager-Abschluss ist projektweit, nicht mehr an eine
 * einzelne Baugruppe gebunden (Fachkorrektur nach Praxiskorrektur-Sprint).
 * Quelltext-Prüfung statt Rendering, da kein React-Test-Renderer im Projekt
 * vorhanden ist (wie bei den übrigen Tests dieses Projekts).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(dir, "..", "..");
const featuresDir = path.join(rootDir, "src", "features", "fastening");
const projectsDir = path.join(rootDir, "src", "features", "projects");

function read(...parts) {
  // \r\n -> \n: macht die Regex-Prüfungen unten unabhängig von
  // core.autocrlf/Checkout-Zeilenenden (Windows-Arbeitsverzeichnis).
  return readFileSync(path.join(...parts), "utf8").replace(/\r\n/g, "\n");
}

describe("A/B) Abschlussstatus wird aus dem Projekt gelesen, nicht aus einer Baugruppen-Zeile", () => {
  it("ProjectCompletionSection liest project[field], keine structureRows/Baugruppen-Suche", () => {
    const source = read(dir, "ProjectCompletionSection.jsx");
    assert.match(source, /checked=\{Boolean\(project\[field\]\)\}/);
    assert.equal(/structureRows/.test(source), false, "keine Baugruppen-Zeilensuche mehr");
    assert.equal(/isBaugruppeRow/.test(source), false);
  });

  it("ohne Projekt wird explizit nichts gerendert (wie zuvor ohne Baugruppen-Kontext)", () => {
    const source = read(dir, "ProjectCompletionSection.jsx");
    assert.match(source, /if \(!setProjectCompletion \|\| !project\) return null;/);
  });

  it("keine Iteration/Liste über mehrere Baugruppen", () => {
    const source = read(dir, "ProjectCompletionSection.jsx");
    assert.equal(/\.map\(/.test(source), false);
  });
});

describe("C/K) Checks.jsx und LagerView.jsx hängen nicht mehr an selectedBaugruppe/project_structure", () => {
  it("Checks.jsx übergibt kein baugruppe-Prop mehr an die Completion-Section und nutzt project statt tb_pruefung_abgeschlossen an project_structure", () => {
    const source = read(featuresDir, "Checks.jsx");
    assert.match(source, /from "\.\.\/\.\.\/components\/ProjectCompletionSection"/);
    assert.match(source, /<ProjectCompletionSection/);
    assert.equal(/BaugruppeCompletionSection/.test(source), false);
    assert.equal(/setBaugruppeCompletion/.test(source), false);
  });

  it("LagerView.jsx übergibt kein baugruppe-Prop mehr an die Completion-Section", () => {
    const source = read(featuresDir, "LagerView.jsx");
    assert.match(source, /from "\.\.\/\.\.\/components\/ProjectCompletionSection"/);
    assert.match(source, /<ProjectCompletionSection/);
    assert.equal(/BaugruppeCompletionSection/.test(source), false);
    assert.equal(/setBaugruppeCompletion/.test(source), false);
  });

  it("beide rufen ausschließlich das bestehende setProjectCompletion() auf, keine neue Funktion", () => {
    const checksSource = read(featuresDir, "Checks.jsx");
    const lagerSource = read(featuresDir, "LagerView.jsx");
    assert.match(checksSource, /setProjectCompletion={setProjectCompletion}/);
    assert.match(lagerSource, /setProjectCompletion={setProjectCompletion}/);
  });
});

describe("D/E) Bauteil-Einstieg und projektweiter Einstieg reichen dasselbe project-Objekt weiter", () => {
  it("ProjectView.jsx übergibt project und setProjectCompletion unverändert an TabContent", () => {
    const source = read(projectsDir, "ProjectView.jsx");
    assert.match(source, /<TabContent[\s\S]*?project=\{project\}/);
    assert.match(source, /setProjectCompletion=\{setProjectCompletion\}/);
  });

  it("ProjectWideView.jsx übergibt dasselbe project und setProjectCompletion an TabContent - keine parallele Fachlogik", () => {
    const source = read(projectsDir, "ProjectWideView.jsx");
    assert.match(source, /<TabContent[\s\S]*?project=\{project\}/);
    assert.match(source, /setProjectCompletion=\{setProjectCompletion\}/);
  });

  it("TabContent.jsx reicht project/setProjectCompletion unverändert an Checks und LagerView weiter (keine Umwandlung)", () => {
    const source = read(projectsDir, "TabContent.jsx");
    assert.match(source, /<Checks[\s\S]*?project=\{project\}[\s\S]*?setProjectCompletion=\{setProjectCompletion\}/);
    assert.match(source, /<LagerView[\s\S]*?project=\{project\}[\s\S]*?setProjectCompletion=\{setProjectCompletion\}/);
  });
});

describe("F) Bauteilwechsel (S1 -> S2) verändert den Completion-State nicht", () => {
  it("ProjectCompletionSection nimmt weder baugruppe noch bauteil als Prop entgegen", () => {
    const source = read(dir, "ProjectCompletionSection.jsx");
    const signature = source.match(/export default function ProjectCompletionSection\(\{[\s\S]*?\}\)/)[0];
    assert.equal(/\bbaugruppe\b/.test(signature), false);
    assert.equal(/\bbauteil\b/.test(signature), false);
    assert.equal(/selectedBaugruppe|selectedBauteil/.test(source), false);
  });
});

describe("G/H/I/J) Mail-Workflow: nur ein Implementierungsort, Trigger unverändert an false->true gebunden", () => {
  it("App.jsx: genau eine Stelle ruft notifyTbPruefungCompleted/notifyLagerCompleted auf", () => {
    const source = read(rootDir, "src", "App.jsx");
    const tbCalls = source.match(/notifyTbPruefungCompleted\(/g) || [];
    const lagerCalls = source.match(/notifyLagerCompleted\(/g) || [];
    assert.equal(tbCalls.length, 1);
    assert.equal(lagerCalls.length, 1);
  });

  it("kein zweiter Aufrufer von notifyTbPruefungCompleted/notifyLagerCompleted im restlichen Code", () => {
    const appSource = read(rootDir, "src", "App.jsx");
    const otherFiles = [
      read(featuresDir, "Checks.jsx"),
      read(featuresDir, "LagerView.jsx"),
      read(dir, "ProjectCompletionSection.jsx"),
      read(rootDir, "src", "services", "useWorkflowWatchers.js"),
    ].join("\n");
    assert.equal(/notifyTbPruefungCompleted|notifyLagerCompleted/.test(otherFiles), false);
    assert.match(appSource, /notifyTbPruefungCompleted/);
  });

  it("Mailversand bleibt an den Übergang false -> true gebunden (nextVal && !prevVal)", () => {
    const source = read(rootDir, "src", "App.jsx");
    const fnMatch = source.match(
      /async function setProjectCompletion\(pid, field, value\) \{[\s\S]*?\n  \}\n/
    );
    assert.ok(fnMatch, "setProjectCompletion nicht gefunden");
    const fnBody = fnMatch[0];
    assert.match(fnBody, /if \(nextVal && !prevVal && supabase\) \{/);
    assert.match(fnBody, /notifyTbPruefungCompleted/);
    assert.match(fnBody, /notifyLagerCompleted/);
  });

  it("setProjectCompletion schreibt auf 'projects', nicht mehr auf 'project_structure'", () => {
    const source = read(rootDir, "src", "App.jsx");
    const fnMatch = source.match(
      /async function setProjectCompletion\(pid, field, value\) \{[\s\S]*?\n  \}\n/
    );
    const fnBody = fnMatch[0];
    assert.match(fnBody, /\.from\("projects"\)/);
    assert.equal(/\.from\("project_structure"\)/.test(fnBody), false);
  });
});
