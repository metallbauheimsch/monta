/**
 * Tests: zwei getrennte Suchfelder im Lager (lokal + projektübergreifend,
 * Praxis-Sprint) und Navigation eines globalen Treffers zum Zielprojekt.
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
const rootDir = path.join(dir, "..", "..", "..");

function read(...parts) {
  return readFileSync(path.join(...parts), "utf8").replace(/\r\n/g, "\n");
}

describe("T/U) lokales Suchfeld zeigt 'In [Projektname] suchen' und filtert weiterhin nur das aktuelle Projekt", () => {
  const source = read(dir, "LagerView.jsx");

  it("Placeholder verwendet projectShortLabel(project) (bestehender Helper, keine neue Namenslogik)", () => {
    assert.match(source, /placeholder=\{`In \$\{projectShortLabel\(project\) \|\| "diesem Projekt"\} suchen`\}/);
  });

  it("lokales Feld bleibt an den bestehenden 'search'-State/Filter gebunden (unveränderte Filterlogik)", () => {
    assert.match(source, /value=\{search\}\s*\n\s*onChange=\{setSearch\}/);
    assert.match(source, /const filteredRows = filterBySearch\(rows, search,/);
  });
});

describe("V/W) zweites, klar getrenntes globales Suchfeld existiert zusätzlich", () => {
  const source = read(dir, "LagerView.jsx");

  it("zeigt Placeholder 'In allen Projekten suchen'", () => {
    assert.match(source, /placeholder="In allen Projekten suchen"/);
  });

  it("verwendet einen eigenen State (globalSearch), überschreibt nie das lokale 'search'", () => {
    assert.match(source, /const \[globalSearch, setGlobalSearch\] = useState\(""\)/);
    // Das globale Feld ist an setGlobalSearch gebunden, nicht an setSearch.
    const globalFieldMatch = source.match(
      /<SearchField\s+value=\{globalSearch\}\s*\n\s*onChange=\{setGlobalSearch\}/
    );
    assert.ok(globalFieldMatch, "globales Suchfeld nicht an eigenen State gebunden");
  });

  it("beide Suchfelder stehen im selben responsiven Container (kein Feld wird bedingt entfernt)", () => {
    assert.match(source, /<div className="searchRow">[\s\S]*?<SearchField[\s\S]*?<SearchField[\s\S]*?<\/div>/);
  });
});

describe("X/Z/AA) globale Suche nutzt buildGlobalSearchResults (zentrale Fehlmengen-/Ersetzungslogik)", () => {
  it("LagerView berechnet globalResults ausschließlich über buildGlobalSearchResults(allProjects/allItems)", () => {
    const source = read(dir, "LagerView.jsx");
    assert.match(source, /from "\.\/globalSearch"/);
    assert.match(
      source,
      /const globalResults = buildGlobalSearchResults\(globalSearch, \{\s*\n\s*projects: allProjects,\s*\n\s*items: allItems,\s*\n\s*\}\);/
    );
  });
});

describe("AC) Klick auf einen globalen Treffer öffnet das richtige Projekt im Lager-Reiter", () => {
  const source = read(dir, "LagerView.jsx");

  it("openGlobalResult ruft openProjectTab(project.id, \"material\") auf - bestehende Navigation, kein neues Routing", () => {
    assert.match(source, /openProjectTab\(result\.project\.id, "material"\)/);
  });

  it("keine neue Browser-URL-Struktur (kein window.location/history in LagerView)", () => {
    assert.equal(/window\.location|history\.push/.test(source), false);
  });
});

describe("openProjectTab: bestehende Deep-Link-Navigation wiederverwendet, kein zweiter Mechanismus", () => {
  it("App.jsx: der Mail-Deep-Link-Handler ruft dieselbe openProjectTab()-Funktion auf statt eigener Logik", () => {
    const source = read(rootDir, "src", "App.jsx");
    assert.match(source, /function openProjectTab\(pid, tabKey\) \{/);
    const deepLinkEffect = source.match(/const parsed = parseDeepLinkParams\([\s\S]*?deepLinkHandledRef\.current = true;/);
    assert.ok(deepLinkEffect, "Deep-Link-Effekt nicht gefunden");
    assert.match(deepLinkEffect[0], /openProjectTab\(parsed\.projectId, parsed\.tab\)/);
  });

  it("openProjectTab wird bis zu LagerView durchgereicht (App -> ProjectView/ProjectWideView -> TabContent -> LagerView)", () => {
    const appSource = read(rootDir, "src", "App.jsx");
    const projectViewSource = read(rootDir, "src", "features", "projects", "ProjectView.jsx");
    const projectWideViewSource = read(rootDir, "src", "features", "projects", "ProjectWideView.jsx");
    const tabContentSource = read(rootDir, "src", "features", "projects", "TabContent.jsx");
    assert.match(appSource, /<ProjectView[\s\S]*?openProjectTab=\{openProjectTab\}/);
    assert.match(appSource, /<ProjectWideView[\s\S]*?openProjectTab=\{openProjectTab\}/);
    assert.match(projectViewSource, /<TabContent[\s\S]*?openProjectTab=\{openProjectTab\}/);
    assert.match(projectWideViewSource, /<TabContent[\s\S]*?openProjectTab=\{openProjectTab\}/);
    assert.match(tabContentSource, /<LagerView[\s\S]*?openProjectTab=\{openProjectTab\}/);
  });
});

describe("AD) kein Suchfeld wird abhängig von der Bildschirmbreite entfernt", () => {
  it(".searchRow verwendet nur flex-wrap (Umbruch), keine display:none/@media-Ausblendung der Suchfelder", () => {
    const css = read(rootDir, "src", "styles", "style.css");
    const rule = css.match(/\.searchRow\{[^}]*\}/);
    assert.ok(rule, ".searchRow-Regel nicht gefunden");
    assert.equal(/display:\s*none/.test(rule[0]), false);
  });
});

describe("Performance (Punkt 13): globale Suche nutzt bereits geladene Daten, keine neue Supabase-Abfrage", () => {
  it("globalSearch.js enthält keinen Supabase-Zugriff", () => {
    const source = read(dir, "globalSearch.js");
    assert.equal(/supabase/i.test(source), false);
  });

  it("LagerView nutzt für die globale Suche die bereits vorhandenen Props allItems/allProjects", () => {
    const source = read(dir, "LagerView.jsx");
    assert.match(source, /allItems,\s*\n\s*allProjects,\s*\n\s*openProjectTab,/);
  });
});
