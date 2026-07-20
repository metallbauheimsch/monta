-- MONTA Bedien-Sprint: Bauteilgruppen
-- Einmalig im Supabase SQL Editor ausführen. Nicht automatisch aus der App.
-- Bestehende project_structure-Zeilen bleiben unverändert (Spalte nullable).

-- Nullable Spalte für die optionale Bauteilgruppe innerhalb einer Baugruppe.
-- Nur bei Bauteil-Zeilen (bauteil IS NOT NULL) relevant.
alter table project_structure
  add column if not exists bauteilgruppe text;

-- Keine neuen Policies nötig: bestehende RLS (select/insert/update/delete)
-- gilt weiterhin für alle Spalten von project_structure.

-- Realtime bleibt über die bestehende Publication für project_structure aktiv.
-- Falls noch nicht erfolgt:
-- alter publication supabase_realtime add table project_structure;
