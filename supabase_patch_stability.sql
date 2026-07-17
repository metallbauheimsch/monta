-- MONTA Stabilitäts-Sprint vor PWA
-- Einmalig in der Live-Supabase (SQL Editor) ausführen, falls noch nicht aktiv.
-- Keine Tabellen-/Spaltänderung – nur Policy und Realtime-Publication.

-- 1) Projekt-Löschen freigeben (fehlte zuvor; Delete schlug per RLS still fehl)
drop policy if exists "public delete projects" on projects;
create policy "public delete projects" on projects for delete using (true);

-- 2) Realtime für Mehrgeräte-Sync
-- Falls die Tabelle schon in der Publication ist, erscheint ein Fehler –
-- dann ist Realtime für diese Tabelle bereits aktiv und der Befehl kann
-- übersprungen werden.
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table material_items;
