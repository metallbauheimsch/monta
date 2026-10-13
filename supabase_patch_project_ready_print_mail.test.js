/**
 * Regressions-Guard (Sprint 2C): Die SQL-Dateien werden NICHT ausgeführt
 * (kein SQL-Client in diesem Projekt) - dieser Test prüft textlich, dass
 * die geforderten Sicherheitsmechanismen in Patch, Aktivierungsskript und
 * Edge Function vorhanden sind. Ersetzt keine echte DB-Prüfung - die
 * erfolgt manuell nach Anwenden des Patches (siehe PROJECT_READY_PRINT_MAIL.md).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(__dirname, p), "utf8").replace(/\r\n/g, "\n");
const patch = read("supabase_patch_project_ready_print_mail.sql");
const activate = read("supabase_activate_project_ready_print_mail.sql");
const edge = read("supabase/functions/workflow-notifications/index.ts");

// Nur ausführbarer SQL-Text (Kommentarzeilen entfernt).
const code = (sql) => sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

describe("Patch: sicher inaktiv, keine Daten-/Mailwirkung", () => {
  it("Schalter startet mit enabled = false", () => {
    assert.match(code(patch), /enabled boolean not null default false/);
    assert.match(code(patch), /values \(1, false\)\s*on conflict \(id\) do nothing;/);
    assert.equal(/enabled\s*=\s*true/.test(code(patch)), false);
  });

  it("Patch erzeugt keine notification_events und keine print_jobs", () => {
    const c = code(patch);
    const outsideFunctions = c.replace(/\$\$[\s\S]*?\$\$/g, "");
    assert.equal(/insert into public\.notification_events/.test(outsideFunctions), false);
    assert.equal(/insert into public\.print_jobs/.test(c), false);
  });

  it("keine Änderung an Projekt-/Materialdaten", () => {
    assert.equal(/(update|delete from)\s+public\.(projects|material_items|project_structure)/i.test(code(patch)), false);
    assert.equal(/(update|delete from)\s+public\.(projects|material_items|project_structure)/i.test(code(activate)), false);
  });

  it("RPC antwortet bei inaktivem Schalter ohne Anlage", () => {
    assert.match(
      patch,
      /if not found or not cfg\.enabled then\s*return jsonb_build_object\('enabled', false/
    );
  });

  it("Insert-Policy für Clients wird NICHT erweitert (kein direkter Client-Insert des neuen Typs)", () => {
    assert.equal(/create policy/i.test(code(patch)), false);
  });

  it("bestehende Ereignistypen bleiben im Typ-Constraint erhalten", () => {
    for (const t of ["baugruppe_created", "cart_items_added", "all_items_ordered", "tb_pruefung_completed", "lager_completed", "warenkorb_completed", "project_ready_print"]) {
      assert.match(patch, new RegExp(`'${t}'`));
    }
    for (const s of ["pending", "processing", "sent", "failed", "skipped"]) {
      assert.match(patch, new RegExp(`'${s}'`));
    }
  });
});

describe("Einmaligkeit je Projekt, geräteübergreifend", () => {
  it("fester event_key je Projekt OHNE Zyklus", () => {
    assert.match(patch, /'project_ready_print:' \|\| pid::text,/);
    assert.equal(/next_notification_cycle/.test(code(patch)), false);
  });

  it("gleichzeitige Geräte: on conflict (event_key) do nothing, nur Gewinner erhält die ID", () => {
    assert.match(patch, /on conflict \(event_key\) do nothing\s*returning id into new_id;/);
    assert.match(patch, /if new_id is not null then\s*created_ids := created_ids \|\| new_id;/);
  });

  it("Materialbereitschaft wird serverseitig frisch geprüft (aktive Positionen, keine Restmenge)", () => {
    assert.match(patch, /if not public\.project_material_ready\(pid\) then\s*continue;/);
    assert.match(patch, /count\(\*\) filter \(where m\.ersetzt_durch is null\) > 0/);
    assert.match(patch, /coalesce\(m\.menge, 0\) - coalesce\(m\.bereit, 0\) > 0/);
  });

  it("Empfänger fest serverseitig stoehr@", () => {
    assert.match(patch, /'stoehr@metallbau-heimsch\.de',/);
  });
});

describe("Fehlgeschlagene Zustellung", () => {
  it("automatische Nachreichung nur für hängende 'pending', nie für 'failed'", () => {
    assert.match(patch, /and n\.status = 'pending'\s*and n\.created_at < now\(\) - interval '2 minutes'/);
    assert.equal(/status = 'failed'/.test(code(patch)), false);
  });

  it("Rollback: pending-Reste aus einer früheren Aktivierung werden nie nachgereicht", () => {
    assert.match(
      code(patch),
      /n\.created_at < now\(\) - interval '2 minutes'\s*and cfg\.activated_at is not null\s*and n\.created_at >= cfg\.activated_at/
    );
  });

  it("Edge Function markiert Fehler als failed (nicht als sent) - auch bei fehlender APP_URL", () => {
    assert.match(edge, /if \(!url\) throw new Error\("APP_URL fehlt\."\);/);
    assert.match(edge, /await markFailed\(\s*admin,\s*id,\s*appUrlMissing \? "APP_URL fehlt - Drucklink kann nicht erzeugt werden\." : undefined\s*\);/);
  });

  it("kontrollierter manueller Wiederholungsweg ist dokumentiert (gezielt failed -> pending)", () => {
    assert.match(activate, /where id = '<event-id>' and event_type = 'project_ready_print' and status = 'failed';/);
  });
});

describe("Bestandsprojekte (bei Einführung bereits grün)", () => {
  const c = code(activate);

  it("Markierung und Aktivierung in EINER Transaktion, Markierung vor dem Einschalten", () => {
    const begin = c.indexOf("begin;");
    const mark = c.indexOf("insert into public.notification_events");
    const enable = c.indexOf("set enabled = true");
    const commit = c.indexOf("commit;");
    assert.ok(begin >= 0 && begin < mark && mark < enable && enable < commit);
  });

  it("alle derzeit materialbereiten Projekte erhalten dauerhaft 'skipped' mit demselben Einmal-Schlüssel", () => {
    assert.match(c, /'project_ready_print:' \|\| p\.id::text,/);
    assert.match(c, /'skipped',/);
    assert.match(c, /where public\.project_material_ready\(p\.id\)\s*on conflict \(event_key\) do nothing;/);
  });

  it("Abbruch, wenn bereits aktiv oder Patch fehlt", () => {
    assert.match(c, /Abbruch: Druckmail ist bereits aktiv\./);
    assert.match(c, /Abbruch: Patch supabase_patch_project_ready_print_mail\.sql fehlt\./);
  });
});

describe("Automatische Druckjobs nach Aktivierung", () => {
  it("Trigger verhindert neue print_jobs nur bei aktivem Schalter", () => {
    assert.match(patch, /before insert on public\.print_jobs/);
    assert.match(patch, /where s\.id = 1 and s\.enabled\s*\) then\s*return null;\s*end if;\s*return new;/);
  });
});

describe("Edge Function: neuer Typ, bestehende Typen unverändert", () => {
  it("project_ready_print aktiv, Empfänger stoehr@, Deep-Link auf Druck", () => {
    assert.match(edge, /project_ready_print: "stoehr@metallbau-heimsch\.de",/);
    assert.match(edge, /project_ready_print: "druck",/);
    assert.match(edge, /const ACTIVE_TYPES = new Set\(\[[\s\S]*?"project_ready_print",[\s\S]*?\]\);/);
  });

  it("bestehende Deep-Link-Zeile unverändert im Format", () => {
    assert.match(edge, /return `\\nDirekt zu MONTA: \$\{url\}\\n`;/);
    assert.match(edge, /return `\$\{appUrl\.replace\(\/\\\/\$\/, ""\)\}\/\?project=\$\{projectId\}&tab=\$\{tab\}`;/);
  });

  it("Druckmail enthält Projektnamen und Drucklink, kein automatischer Druck", () => {
    const block = edge.match(/if \(eventType === "project_ready_print"\) \{[\s\S]*?\n  \}\n/)[0];
    assert.match(block, /\$\{projectName\}/);
    assert.match(block, /\$\{url\}/);
    assert.equal(/print_jobs|print\(/.test(block), false);
  });

  it("vorgegebener Betreff und Mailtext (Auftrag 3)", () => {
    const block = edge.match(/if \(eventType === "project_ready_print"\) \{[\s\S]*?\n  \}\n/)[0];
    assert.match(block, /subject: `MONTA – Projekt bereit zur Druckausgabe`,/);
    assert.match(block, /`Servus Moritz,\\n\\n` \+/);
    assert.match(block, /`das Material für das Projekt „\$\{projectName\}“ ist vollständig bereit\.\\n\\n` \+/);
    assert.match(block, /`Die Montageunterlagen können jetzt über MONTA geöffnet und gedruckt werden:\\n\\n` \+/);
    assert.match(block, /`Direkt zur Druckansicht: \$\{url\}\\n\\n` \+/);
    assert.match(block, /`Viele Grüße\\n` \+\s*`MONTA\\n`,/);
  });
});
