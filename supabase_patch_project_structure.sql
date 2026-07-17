-- MONTA Pilot Sprint: Mehrgeräte-fähige Projektstruktur
-- Einmalig im Supabase SQL Editor ausführen. Nicht automatisch aus der App.
-- Bestehende projects / material_items bleiben unverändert.

-- 1) Tabelle project_structure
--    bauteil IS NULL  → Baugruppe
--    bauteil gesetzt  → Bauteil innerhalb der Baugruppe
create table if not exists project_structure (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  baugruppe text not null,
  bauteil text,
  created_at timestamptz default now(),
  sort_order integer
);

-- Duplikate verhindern (leeres bauteil = Baugruppen-Eintrag)
create unique index if not exists project_structure_unique
  on project_structure (project_id, baugruppe, (coalesce(bauteil, '')));

alter table project_structure enable row level security;

drop policy if exists "public read structure" on project_structure;
drop policy if exists "public insert structure" on project_structure;
drop policy if exists "public update structure" on project_structure;
drop policy if exists "public delete structure" on project_structure;

create policy "public read structure" on project_structure for select using (true);
create policy "public insert structure" on project_structure for insert with check (true);
create policy "public update structure" on project_structure for update using (true);
create policy "public delete structure" on project_structure for delete using (true);

-- 2) Realtime
-- Falls die Tabelle schon in der Publication ist, erscheint ein Fehler –
-- dann ist Realtime bereits aktiv und der Befehl kann übersprungen werden.
alter publication supabase_realtime add table project_structure;
