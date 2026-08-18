-- MONTA Sprint 2B: Materialersetzung - minimale Schemaerweiterung
-- NUR VORBEREITET. NICHT automatisch ausgeführt.
-- Einmalig manuell im Supabase SQL Editor ausführen, sobald fachlich freigegeben.
--
-- Zweck:
--   Kennzeichnung, dass eine material_items-Zeile durch eine andere,
--   neuere Zeile fachlich ersetzt wurde (siehe MONTA_DECISIONS.md /
--   Sprint-2-Analyse). Bestehende Zeilen bleiben inhaltlich unverändert:
--
--     ersetzt_durch IS NULL
--       -> Position ist normaler aktueller Bedarf (heutiges Verhalten,
--          exakt wie bisher - betrifft ALLE bestehenden Datensätze).
--
--     ersetzt_durch = <id einer anderen material_items-Zeile>
--       -> diese Position wurde durch jene neue Position ersetzt; sie
--          bleibt als Nachweis der real vorbereiteten/bestellten Menge
--          erhalten, zählt aber nicht mehr als aktueller Bedarf.
--
-- Sicherheit (MONTA_SAFETY.md):
--   - Keine Massenmigration, kein Backfill: Default ist NULL, bestehende
--     Zeilen werden durch dieses Skript inhaltlich nicht angefasst.
--   - Kein CASCADE-Löschen: wird eine neue Position irgendwann gelöscht,
--     wird bei der Altposition nur der Verweis auf NULL gesetzt - die
--     Altposition selbst (inkl. ihrer realen bereit-/bestellt-Werte)
--     bleibt unangetastet erhalten.
--   - Idempotent: mehrfaches Ausführen ist ungefährlich (IF NOT EXISTS).

alter table public.material_items
  add column if not exists ersetzt_durch uuid references public.material_items(id) on delete set null;

create index if not exists material_items_ersetzt_durch_idx
  on public.material_items (ersetzt_durch);

comment on column public.material_items.ersetzt_durch is
  'Verweis auf die neue material_items-Zeile, falls diese Position fachlich ersetzt wurde (NULL = aktueller Bedarf). Siehe Sprint 2B.';

-- Kein UPDATE auf bestehende Zeilen, keine Löschung, keine RLS-Änderung
-- nötig (bestehende "active update/select items"-Policies aus
-- supabase_patch_auth_lockdown.sql decken die neue Spalte automatisch mit ab).
