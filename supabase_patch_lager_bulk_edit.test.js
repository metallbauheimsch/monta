/**
 * Regressions-Guard (GPT-Code-Review-Korrektur 2): supabase_patch_lager_bulk_edit.sql
 * wird nicht ausgeführt (kein SQL-Client in diesem Projekt) - dieser Test
 * prüft nur, dass die geforderten Sicherheitsmechanismen textlich im
 * SQL-Patch vorhanden sind, damit eine künftige Änderung sie nicht
 * versehentlich wieder entfernt. Ersetzt keine echte DB-/RLS-Prüfung -
 * die erfolgt manuell nach Anwenden des Patches (siehe Abschlussbericht).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(__dirname, "supabase_patch_lager_bulk_edit.sql"), "utf8");

describe("Doppelte/widersprüchliche IDs werden vor jedem Schreibvorgang abgewiesen", () => {
  it("prüft auf doppelte source_id innerhalb p_replacements", () => {
    assert.match(sql, /mehrfach in der Ersetzungsliste/);
  });

  it("prüft auf doppelte id innerhalb p_direct_updates", () => {
    assert.match(sql, /mehrfach in der Direktänderungsliste/);
  });

  it("prüft, dass dieselbe Position nicht gleichzeitig ersetzt und direkt geändert wird", () => {
    assert.match(sql, /nicht gleichzeitig ersetzt und direkt geändert/);
  });

  it("die Duplikat-/Konflikt-Prüfungen stehen vor dem ersten FOR UPDATE (kein Schreiben bei fehlerhaftem Payload)", () => {
    const dupCheckIdx = sql.indexOf("mehrfach in der Ersetzungsliste");
    const firstForUpdateIdx = sql.indexOf("for update;");
    assert.ok(dupCheckIdx > -1 && firstForUpdateIdx > -1);
    assert.ok(dupCheckIdx < firstForUpdateIdx, "Duplikatprüfung muss vor dem ersten Zeilen-Lock stehen");
  });
});

describe("Race-Schutz: Direktänderung wird nach dem Sperren gegen den aktuellen DB-Zustand geprüft", () => {
  it("bricht ab, wenn eine Position inzwischen vorbereitet/bestellt wurde", () => {
    assert.match(sql, /Position wurde inzwischen vorbereitet oder bestellt/);
  });

  it("prüft bereit > 0 ODER bestellt = true", () => {
    assert.match(sql, /coalesce\(v_source\.bereit, 0\) > 0 or v_source\.bestellt/);
  });

  it("prüft alle vier Identitätsfelder (Bezeichnung/Größe/Länge/Ausführung)", () => {
    for (const field of ["bezeichnung", "groesse", "laenge", "oberflaeche"]) {
      assert.match(sql, new RegExp(`v_upd \\? '${field}'`));
    }
  });

  it("behandelt ein im Payload fehlendes Feld nicht als Änderung (jsonb '?'-Existenzprüfung, keine bloße COALESCE-Annahme)", () => {
    assert.match(sql, /v_upd \? 'bezeichnung'/);
  });

  it("vergleicht NULL-sicher (IS DISTINCT FROM)", () => {
    assert.match(sql, /is distinct from/);
  });

  it("die Race-Prüfung steht nach dem Zeilen-Lock, aber vor jedem INSERT/UPDATE", () => {
    const raceCheckIdx = sql.indexOf("Position wurde inzwischen vorbereitet oder bestellt");
    const firstInsertIdx = sql.indexOf("insert into public.material_items");
    const firstUpdateWriteIdx = sql.indexOf("update public.material_items set\n      bezeichnung");
    assert.ok(raceCheckIdx > -1 && firstInsertIdx > -1 && firstUpdateWriteIdx > -1);
    assert.ok(raceCheckIdx < firstInsertIdx);
    assert.ok(raceCheckIdx < firstUpdateWriteIdx);
  });

  it("keine automatische Umklassifizierung - die Zeile wird bei Konflikt nicht stillschweigend als Ersetzung behandelt", () => {
    assert.doesNotMatch(sql, /automatisch (umklassifizier|zu einer Ersetzung wechsel)/i);
  });
});

describe("Bestehende Schutzmechanismen bleiben erhalten", () => {
  it("alle Positionen müssen zum selben Projekt gehören", () => {
    assert.match(sql, /müssen zum selben Projekt gehören/);
  });

  it("ersetzt_durch darf vorher nicht gesetzt sein", () => {
    assert.match(sql, /ersetzt_durch is not null/);
  });

  it("projektweite Sperre für Positionsvergabe bleibt bestehen", () => {
    assert.match(sql, /from public\.projects where id = v_project_id for update/);
  });

  it("security invoker, kein security definer", () => {
    assert.match(sql, /security invoker/);
    assert.doesNotMatch(sql, /security definer/);
  });

  it("EXECUTE-Rechte: anon entzogen, authenticated erteilt", () => {
    assert.match(sql, /revoke execute on function public\.replace_material_items_bulk\(jsonb, jsonb\) from anon/);
    assert.match(sql, /grant execute on function public\.replace_material_items_bulk\(jsonb, jsonb\) to authenticated/);
  });

  it("SQL ist idempotent (create or replace function)", () => {
    assert.match(sql, /create or replace function public\.replace_material_items_bulk/);
  });
});
