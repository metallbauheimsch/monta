
-- MONTA Supabase Tabellenstruktur v0.4
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  nr text not null,
  name text not null,
  baugruppe text,
  zeichnung text,
  created_at timestamptz default now()
);

create table if not exists material_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  pos text,
  einbauort text not null,
  menge numeric not null default 0,
  bezeichnung text not null,
  groesse text,
  laenge text,
  oberflaeche text,
  hinweis text,
  bereit numeric default 0,
  bestellt boolean default false,
  geliefert boolean default false,
  created_at timestamptz default now()
);

alter table projects enable row level security;
alter table material_items enable row level security;

drop policy if exists "public read projects" on projects;
drop policy if exists "public insert projects" on projects;
drop policy if exists "public update projects" on projects;
drop policy if exists "public delete projects" on projects;
drop policy if exists "public read items" on material_items;
drop policy if exists "public insert items" on material_items;
drop policy if exists "public update items" on material_items;
drop policy if exists "public delete items" on material_items;

-- Für den internen Prototyp ohne Login:
create policy "public read projects" on projects for select using (true);
create policy "public insert projects" on projects for insert with check (true);
create policy "public update projects" on projects for update using (true);
-- Ohne Delete-Policy schlägt jedes Projekt-Löschen still fehl (RLS) –
-- auch das letzte verbleibende Projekt (Stabilitäts-Sprint vor PWA).
create policy "public delete projects" on projects for delete using (true);

create policy "public read items" on material_items for select using (true);
create policy "public insert items" on material_items for insert with check (true);
create policy "public update items" on material_items for update using (true);
create policy "public delete items" on material_items for delete using (true);

-- Realtime für Mehrgeräte-Sync (in Supabase: Publication supabase_realtime).
-- Falls noch nicht aktiv, im SQL-Editor ausführen:
-- alter publication supabase_realtime add table projects;
-- alter publication supabase_realtime add table material_items;
